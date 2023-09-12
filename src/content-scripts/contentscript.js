console.log("loaded content script");
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
    }
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
    return true;
});