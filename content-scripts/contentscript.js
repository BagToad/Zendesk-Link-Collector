console.log("loaded content script");
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == "scroll") {
        const element = document.querySelector(`[data-comment-id="${request.commentId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }
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
