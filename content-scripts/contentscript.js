console.log("loaded content script");
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == "scroll") {
        const element = document.querySelector(`[data-comment-id="${request.commentId}"]`);
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

browser.commands.onCommand.addListener((command) => {
  console.log(`Command: ${command}`);
});