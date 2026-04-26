// Idempotent listener registration: stash the named listener function on
// globalThis. If the script runs twice in the same isolated world (e.g.
// the manifest content_script auto-injection plus a programmatic
// re-injection on extension install/update), the previous listener is
// removed before the new one is added. Works whether the isolated world
// persists across updates or not, and whether manifest or programmatic
// injection runs first.
if (globalThis.__zlcOnMessage) {
  browser.runtime.onMessage.removeListener(globalThis.__zlcOnMessage);
}

console.log("Zendesk Link Collector - loaded content script");

// Message handler for messages from the background script.
//
// Chrome's MV3 dispatch treats the listener's return value as the
// keep-channel-open signal: returning `true` tells Chrome "I'll call
// sendResponse asynchronously, leave the port open." If we returned
// `true` from a branch that never calls sendResponse, the port would
// stay open until it timed out and the sender's `sendMessage` promise
// would reject with "message port closed before response" — which the
// old webextension-polyfill swallowed but native chrome.* doesn't.
// Each branch therefore decides explicitly whether to keep the port
// open. Synchronous and fire-and-forget branches fall through and
// return `undefined`; only the genuinely async `fetch` branch returns
// `true`.
function zlcOnMessage(request, sender, sendResponse) {
  // Scroll to the comment. Fire-and-forget — no sendResponse.
  if (request.type == "scroll") {
    (async () => {
      const element = document.querySelector(
        `[data-comment-id="${request.commentID}"]`
      )
        ? // Older Zendesk versions.
          document.querySelector(`[data-comment-id="${request.commentID}"]`)
        : // Newer Zendesk versions.
          document.querySelector(`[id="comment-${request.auditID}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightComment(element);
        return;
      }
      // Last resort, sometimes zendesk does not add the data-comment-id or id attributes to the comments.
      // Get the comment from the audits endpoint, find the comment with the same HTML in the DOM and scroll to it.
      const url = new URL(document.URL);
      const urlArr = url.href.split("/");
      const ticketID = urlArr[urlArr.length - 1];

      const response = await fetch(
        `${url.protocol}//${url.hostname}/api/v2/tickets/${ticketID}/audits/${request.auditID}`
      );
      const data = await response.json();
      document.querySelectorAll(".zd-comment").forEach((comment) => {
        data.audit.events.forEach((event) => {
          if (event.type == "Comment") {
            if (comment.outerHTML == event.html_body) {
              comment.scrollIntoView({ behavior: "smooth", block: "center" });
              highlightComment(comment);
              return;
            }
          }
        });
      });
    })();
    return;
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
    // Async sendResponse — keep the port open.
    return true;
  }

  // Background script does not have a DOM, so when it needs to parse links from HTML, it sends this message.
  // sendResponse runs synchronously inside this branch, so no `return true` needed.
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
    return;
  }

  // The remaining branches are fire-and-forget — no sendResponse calls.
  // We fall through and return undefined so Chrome closes the port and
  // the sender's `sendMessage` promise resolves immediately.

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
}

globalThis.__zlcOnMessage = zlcOnMessage;
browser.runtime.onMessage.addListener(zlcOnMessage);

function highlightComment(element) {
  let highlightElement = element;
  let counter = 0;
  const maxCounter = 20;
  // Traverse up the DOM tree until an 'article' element is found or counter reaches 10
  while (
    highlightElement &&
    highlightElement.nodeName.toLowerCase() !== "article" &&
    counter < maxCounter
  ) {
    highlightElement = highlightElement.parentElement;
    counter++;
  }

  // If an 'article' element is found or the nth parent is reached, highlight whatever the element is.
  if (highlightElement) {
    const originalColor = highlightElement.style.backgroundColor;

    highlightElement.style.transition = "background-color 0.5s ease";
    highlightElement.style.backgroundColor = "#ffff99";
    setTimeout(() => {
      // Set the background color back to its original color to start the fade-out transition
      highlightElement.style.backgroundColor = originalColor;
    }, 2000);

    // After the transition is complete, remove the style attribute
    setTimeout(() => {
      highlightElement.removeAttribute("style");
    }, 2500); // Ensure the style attribute is removed after the transition is complete.
    // This is very important to ensure the HTML of this element stays the same as what is returned by the audits endpoint.
  }
}