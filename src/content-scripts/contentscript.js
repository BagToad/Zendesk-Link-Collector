console.log("Zendesk Link Collector - loaded content script");

// Message handler for messages from the background script.
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Scroll to the comment.
  if (request.type == "scroll") {
    const element = document.querySelector(`[data-comment-id="${request.commentID}"]`) 
    // Older Zendesk versions.
    ? document.querySelector(`[data-comment-id="${request.commentID}"]`)
    // Newer Zendesk versions.
    : document.querySelector(`[id="comment-${request.auditID}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    // Last resort, sometimes zendesk does not add the data-comment-id or id attributes to the comments.
    // Get the comment from the audits endpoint, find the comment with the same HTML in the DOM and scroll to it.
    const url = new URL(document.URL);
    const urlArr = url.href.split('/');
    const ticketID = urlArr[urlArr.length - 1];
    
    fetch(`${url.protocol}//${url.hostname}/api/v2/tickets/${ticketID}/audits/${request.auditID}`).then(async function(response) {
    const data = await response.json();
    document.querySelectorAll('.zd-comment').forEach((comment) => {
      data.audit.events.forEach((event) => {
        if (event.type == 'Comment') {
          if (comment.outerHTML == event.html_body) {
            comment.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        }
      });
    });
  });
}

// Code from https://stackoverflow.com/questions/55214828/how-to-make-a-cross-origin-request-in-a-content-script-currently-blocked-by-cor/55215898#55215898
if (request.type == 'fetch') {
  fetch(request.input, request.init).then(function(response) {
    return response.text().then(function(text) {
      sendResponse([{
        body: text,
        status: response.status,
        statusText: response.statusText,
      }, null]);
    });
  }, function(error) {
    sendResponse([null, error]);
  });
}

// Background script does not have a DOM, so when it needs to parse links from HTML, it sends this message. 
if (request.type == 'parse-html-a') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(request.htmlText, "text/html");
  const links = doc.querySelectorAll(`a`);
  const linksArr = [];
  links.forEach((link) => {
    linksArr.push(
      {
      parent_text: link.parentElement.innerHTML,
      text: link.innerText,
      href: link.href
      }
    );
  });
  sendResponse(linksArr);
}

return true;
});