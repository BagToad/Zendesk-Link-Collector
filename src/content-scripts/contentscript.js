console.log("Zendesk Link Collector - loaded content script");

// Message handler for messages from the background script.
browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Scroll to the comment.
  if (request.type == "scroll") {
    const element = document.querySelector(
      `[data-comment-id="${request.commentID}"]`
    )
      ? // Older Zendesk versions.
        document.querySelector(`[data-comment-id="${request.commentID}"]`)
      : // Newer Zendesk versions.
        document.querySelector(`[id="comment-${request.auditID}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightComment(element); // Call the new highlight function after scrolling
      return;
    }

    // Last resort, sometimes zendesk does not add the data-comment-id or id attributes to the comments.
    // Get the comment from the audits endpoint, find the comment with the same HTML in the DOM and scroll to it.
    const url = new URL(document.URL);
    const urlArr = url.href.split("/");
    const ticketID = urlArr[urlArr.length - 1];

    fetch(
      `${url.protocol}//${url.hostname}/api/v2/tickets/${ticketID}/audits/${request.auditID}`
    ).then(async function (response) {
      const data = await response.json();
      document.querySelectorAll(".zd-comment").forEach((comment) => {
        data.audit.events.forEach((event) => {
          if (event.type == "Comment") {
            if (comment.outerHTML == event.html_body) {
              comment.scrollIntoView({ behavior: "smooth", block: "center" });
              highlightComment(comment); // Call the new highlight function after scrolling
              return;
            }
          }
        });
      });
    });
  }

  // Code from https://stackoverflow.com/questions/55214828/how-to-make-a-cross-origin-request-in-a-content-script-currently-blocked-by-cor/55215898#55215898
  if (request.type == "fetch") {
    fetch(request.input, request.init).then(
      function (response) {
        return response.text().then(function (text) {
          sendResponse([
            {
              body: text,
              status: response.status,
              statusText: response.statusText,
            },
            null,
          ]);
        });
      },
      function (error) {
        sendResponse([null, error]);
      }
    );
  }

  // Background script does not have a DOM, so when it needs to parse links from HTML, it sends this message.
  if (request.type == "parse-html-a") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(request.htmlText, "text/html");
    const links = doc.querySelectorAll(`a`);
    const linksArr = [];
    links.forEach((link) => {
      linksArr.push({
        parent_text: link.parentElement.innerHTML,
        text: link.innerText,
        href: link.href,
      });
    });
    sendResponse(linksArr);
  }

  // Try to open zendesk preview.
  if (request.type == "image-preview") {
    const imageURL = request.imageURL;
    document.querySelectorAll("a").forEach((a) => {
      if (a.href == imageURL) {
        //Close any modal that are open.
        const closeButton = document.querySelector(
          '[data-garden-id="modals.close"]'
        );
        if (closeButton) {
          closeButton.click();
        }
        if (a) {
          a.click();
        }
      }
    });
  }

  // Copying to clipboard not possible
  if (request.type == "copy-not-possible") {
    navigator.clipboard.writeText("ZLC - Background processing disabled.");
  }

  // Copy ticket ID to clipboard.
  if (request.type == "copy-ticket-id") {
    browser.storage.local.get("ticketStorage").then((data) => {
      if (
        data.ticketStorage == undefined ||
        data.ticketStorage.ticketID == undefined
      ) {
        return;
      }
      navigator.clipboard.writeText(data.ticketStorage.ticketID);
    });
  }

  // Copy ticket ID to clipboard in markdown.
  if (request.type == "copy-ticket-id-md") {
    browser.storage.local.get("ticketStorage").then((data) => {
      if (
        data.ticketStorage == undefined ||
        data.ticketStorage.ticketID == undefined
      ) {
        return;
      }
      navigator.clipboard.writeText(
        `[ZD#${data.ticketStorage.ticketID}](${document.URL})`
      );
    });
  }

  return true;
});

// Function to visually highlight the scrolled-to comment
function highlightComment(element) {
  element.style.transition = "background-color 0.5s ease";
  element.style.backgroundColor = "#ffff99"; // Temporary highlight color
  setTimeout(() => {
    element.style.backgroundColor = ""; // Remove highlight after a few seconds
  }, 2000); // Ensure the highlight fades away after a few seconds
}
