// "importScripts" is only supported in chrome. Firefox loads the polyfill from the manifest.json file.
if (typeof importScripts === "function") {
  importScripts("../lib/browser-polyfill.min.js");
}

// Sends a message to the content script to execute a fetch.
// Code from https://stackoverflow.com/questions/55214828/how-to-make-a-cross-origin-request-in-a-content-script-currently-blocked-by-cor/55215898#55215898
async function fetchResource(input, init) {
  const type = "fetch";
  return new Promise((resolve, reject) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.tabs
        .sendMessage(tabs[0].id, { type, input, init })
        .then((messageResponse) => {
          const [response, error] = messageResponse;
          if (response === null) {
            reject(error);
          } else {
            // Use undefined on a 204 - No Content
            const body = response.body ? new Blob([response.body]) : undefined;
            resolve(
              new Response(body, {
                status: response.status,
                statusText: response.statusText,
              })
            );
          }
        });
    });
  });
}

// Parse the HTML text and return an array of links.
async function parseAElementsFromHTMLText(htmlText) {
  const type = "parse-html-a";
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: type,
    htmlText: htmlText,
  });
  return response;
}

// Fetch ticket data, fetch settings, process the ticket, then store the result.
// This function is called when the extension is first loaded, when the ticket is changed, and when the settings are changed.
// There are three sections of this function:
// 1. Comment collecting loop section - collects all comments from the ticket.
// 2. Custom field link collecting section - collects all links from custom fields.
// 3. Link filtering section - filters the links based on the settings.
async function filterTicket() {
  // Reset the ticketStorage to loading.
  await browser.storage.local.set({
    ticketStorage: {
      links: [],
      attachments: [],
      images: [],
      state: "loading",
    },
  });

  // Get the current active tab.
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await browser.tabs.query(queryOptions);

  // Get make a real URL from the text URL.
  const url = new URL(tab.url);

  // Get the ticket ID from the URL.
  const stringArr = url.href.split("/");
  const ticketID = stringArr[stringArr.length - 1];
  const ticketURL = `https://${url.hostname}/agent/tickets/${ticketID}`;

  // Comment collecting loop section
  // *******************************
  const rlimit = 25; // Max number of requests to make.
  const firstPage = `https://${url.hostname}/api/v2/tickets/${ticketID}/comments?sort_order=desc`; // URL of the first page of comments.
  let nextPage = firstPage; // URL of the next page of comments.
  let r = 1; // Number of requests made.

  let numComments = 0; // Number of comments received from Zendesk.
  const linksArr = []; // Array of link objects to be displayed.
  const attachmentsArr = []; // Array of attachment objects to be displayed.
  const imagesArr = []; // Array of image objects to be displayed.

  // Loop through all pages of comments until there are no more pages.
  while (nextPage != "" && r <= rlimit) {
    console.log(`Processing request #${r}`);

    // Get the next page of comments data.
    const response = await fetchResource(nextPage).catch((error) => {
      console.error("Request failed:", error);
    });
    const commentData = await response.json();
    if (commentData.next_page != null) {
      nextPage = commentData.next_page;
    } else {
      nextPage = "";
    }

    // If this is the first request, get the number of comments.
    // (the number of comments doesn't change between requests)
    if (r == 1 && commentData.count > 0) {
      console.log(`Received ${commentData.count} comments`);
      numComments = commentData.count;
    }

    // Increment the request counter.
    r++;

    //Grab only the required fields from the JSON.
    await commentData.comments.forEach(async (comment) => {
      // Parse the HTML text and return an array of links.
      const links = await parseAElementsFromHTMLText(comment.html_body);
      // Push the required link information to the linksArr.
      if (links.length > 0) {
        links.forEach((link) => {
          linksArr.push({
            commentID: comment.id,
            auditID: comment.audit_id,
            createdAt: comment.created_at,
            parent_text: link.parent_text,
            text: link.text,
            href: link.href,
            source: "comment",
          });
        });
      }

      // Push the required attachment information to the attachmentsArr.
      if (comment.attachments.length > 0) {
        const tempArr = [];
        comment.attachments.forEach((attachment) => {
          if (!attachment.content_type.startsWith("image/")) {
            tempArr.push(attachment);
          }
        });
        if (tempArr.length > 0) {
          attachmentsArr.push({
            commentID: comment.id,
            auditID: comment.audit_id,
            created_at: comment.created_at,
            attachments: tempArr,
          });
        }
      }

      // Filter images out of attachments data and push to imagesArr
      comment.attachments.forEach((attachment) => {
        if (attachment.content_type.startsWith("image/")) {
          imagesArr.push({
            commentID: comment.id,
            auditID: comment.audit_id,
            createdAt: comment.created_at,
            url: attachment.content_url,
            mappedURL: attachment.mapped_content_url,
            fileName: attachment.file_name,
          });
        }
      });
    });
  }

  // Custom field link collecting section.
  // *************************************
  const response = await fetchResource(
    `https://${url.hostname}/api/v2/tickets/${ticketID}`
  ).catch((error) => {
    console.error("Request failed:", error);
  });
  const ticketData = await response.json();
  const customFields = ticketData.ticket.custom_fields;

  // For each custom field, check if it is a string and if it contains a link.
  customFields.forEach((field) => {
    if (field.value != null && typeof field.value == "string") {
      field.value.split(/[\n\s]/g).forEach((valueArrItem) => {
        // If the value is a link, add it to the linksArr for filtering.
        if (valueArrItem.search(/^https?:\/\//i) >= 0) {
          console.log(`found link in custom field: ${valueArrItem}`);
          linksArr.push({
            createdAt: null,
            text: valueArrItem,
            href: valueArrItem,
            source: "custom field",
          });
        }
      });
    }
  });

  // Link filtering section - this is where the magic (regex) happens.
  // ****************************************************************
  const filters = await browser.storage.sync
    .get("options")
    .then((optionsStorage) => {
      if (
        optionsStorage.options == undefined ||
        optionsStorage.options.length <= 0
      ) {
        optionsStorage.options = [];
      }
      return optionsStorage.options;
    });

  // This is an array of objects with the following structure:
  // {
  //   title: "",
  //   showParent: true/false,
  //   links: []
  // }
  const filteredLinks = [];

  // For each filter, check if any of the links in the linksArr match
  // the filter pattern. If they do, add them to the filteredLinks array
  filters.forEach((filter) => {
    const filteredLinksArr = [];
    linksArr.forEach((link) => {
      const re = new RegExp(filter.pattern);
      if (re.test(link.href)) {
        const link2Push = Object.assign({}, link);
        link2Push.summaryType =
          filter.summaryType === undefined ? "all" : filter.summaryType;
        link2Push.showDate =
          filter.showDate === undefined ? false : filter.showDate;
        filteredLinksArr.push(link2Push);
      }
    });

    // Remove duplicates. Keep the latest.
    const filteredLinksArrUnique = [];
    filteredLinksArr.forEach((link) => {
      const found = filteredLinksArrUnique.find((l) => l.href == link.href);
      // If not found, add to uniques array.
      if (found == undefined) {
        filteredLinksArrUnique.push(link);
        // If found, compare createdAt dates and keep the latest.
      } else if (link.createdAt > found.createdAt && found.createdAt != null) {
        filteredLinksArrUnique.push(link);
        filteredLinksArrUnique.splice(filteredLinksArrUnique.indexOf(found), 1);
        console.log("Removing duplicate link: " + link.href);
      }
    });

    // Add the unique links to the filteredLinks array.
    if (filteredLinksArrUnique.length > 0) {
      filteredLinks.push({
        title: filter.title,
        showParent: filter.showParent,
        links: filteredLinksArrUnique,
      });
    }
  });

  // Alternative implementation of the previous algorithm for future thought:
  /*
const filteredLinks = filters.flatMap((filter) => {
  const re = new RegExp(filter.pattern);
  const filteredLinksArr = linksArr
    .filter((link) => re.test(link.href))
    .map((link) => {
      return {
        ...link,
        summaryType: filter.summaryType === undefined ? "all" : filter.summaryType,
        showDate: filter.showDate === undefined ? false : filter.showDate,
      };
    });

  const filteredLinksArrUnique = filteredLinksArr.reduce((unique, link) => {
    const found = unique.find((l) => l.href == link.href);
    if (!found) {
      return [...unique, link];
    } else if (link.createdAt > found.createdAt && found.createdAt != null) {
      return [...unique.filter((l) => l.href !== link.href), link];
    } else {
      return unique;
    }
  }, []);

  if (filteredLinksArrUnique.length > 0) {
    return {
      title: filter.title,
      showParent: filter.showParent,
      links: filteredLinksArrUnique,
    };
  } else {
    return [];
  }
});
*/

  console.log("filtered links: ", filteredLinks);
  console.log("attachments: ", attachmentsArr);
  console.log("images: ", imagesArr); // Log the images array

  // Store the filtered links, attachments, and images for the current ticket in the browser storage.
  browser.storage.local.set({
    ticketStorage: {
      links: filteredLinks,
      attachments: attachmentsArr,
      images: imagesArr, // Store the images array
      state: "complete",
      count: numComments,
      ticketID: ticketID,
      ticketURL: ticketURL,
      updatedAt: Date.now(),
    },
  });
}

// Compare two version strings.
// Return 1 if version1 is greater than version2.
// Return -1 if version1 is less than version2.
// Return 0 if version1 is equal to version2.
function compareVersions(version1, version2) {
  const v1parts = version1.split(".");
  const v2parts = version2.split(".");

  for (let i = 0; i < v1parts.length; ++i) {
    if (v2parts.length === i) {
      return 1;
    }

    if (v1parts[i] === v2parts[i]) {
      continue;
    }
    if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    return -1;
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
}

// Extension has been updated or initially installed.
// Handles setting default options and updating storage based on previous version.
browser.runtime.onInstalled.addListener((data) => {
  const reason = data.reason;
  const previousVersion = data.previousVersion;
  if (reason === "install") {
    console.log("Zendesk Link Collector - installed");
    // Set the default options.
    browser.storage.sync.set({
      optionsGlobal: {
        wrapLists: false,
        backgroundProcessing: false,
        includeAttachments: true,
        includeImages: true,
      },
    });
  } else if (reason === "update") {
    console.log(
      "Zendesk Link Collector - updated from version " + previousVersion
    );
    // Check that all currently expected storage values are set.
    // If not, set them to default.
    browser.storage.sync.get("optionsGlobal").then((data) => {
      if (data.optionsGlobal == undefined) {
        data.optionsGlobal = {};
      }
      browser.storage.sync.set({
        optionsGlobal: {
          wrapLists:
            data.optionsGlobal.wrapLists === undefined
              ? false
              : data.optionsGlobal.wrapLists,
          backgroundProcessing:
            data.optionsGlobal.backgroundProcessing === undefined
              ? false
              : data.optionsGlobal.backgroundProcessing,
          includeAttachments:
            data.optionsGlobal.includeAttachments === undefined
              ? true
              : data.optionsGlobal.includeAttachments,
          includeImages:
            data.optionsGlobal.includeImages === undefined
              ? true
              : data.optionsGlobal.includeImages,
        },
      });
    });

    // EXAMPLE: Update storage based on previous version. For when that might be needed.
    //
    // if (compareVersions(previousVersion, "1.1.0") == -1) {
    //   browser.storage.sync.get("optionsGlobal").then((data) => {
    //     browser.storage.sync.set({
    //       optionsGlobal: {
    //         wrapLists: data.optionsGlobal.wrapLists,
    //         backgroundProcessing: false,
    //       },
    //     });
    //   });
    // }
  }
});

// Check if background processing is enabled.
// This is used to control whether event listeners that indicate a new ticket is being viewed should do anything.
async function isBackgroundProcessingEnabled() {
  const data = await browser.storage.sync.get("optionsGlobal");
  // Just in case the options are not set, return false.
  if (
    data.optionsGlobal == undefined ||
    data.optionsGlobal.backgroundProcessing == undefined
  ) {
    return false;
  }
  return data.optionsGlobal.backgroundProcessing;
}

// A new browser tab is active.
// This is used to detect when a new ticket is being viewed.
// Filter out events from active tabs that are not ticket pages.
browser.tabs.onActivated.addListener((activeTab) => {
  browser.tabs.get(activeTab.tabId).then((tab) => {
    // Only process ticket pages.
    // Disable extension and change icon to grey if not a ticket page.
    if (
      !tab.url ||
      tab.url.search(
        /^https:\/\/[\-_A-Za-z0-9]+\.zendesk.com\/agent\/tickets\/[0-9]+/i
      ) == -1
    ) {
      browser.action.disable(tab.id);
      browser.action.setIcon({ path: "../icons/zlc-icon-disabled-16x16.png" });
      return;
    }
    // A new ticket is being viewed, so process it and enable the extension.
    isBackgroundProcessingEnabled().then((status) => {
      if (status) {
        filterTicket();
      }
    });

    browser.action.setIcon({ path: "../icons/zlc-icon-16x16.png" });
    browser.action.enable(tab.id);
  });
});

// A browser tab is updated.
// This is used to detect when a new ticket is being viewed.
// Filter out events from tabs that are not active, or are not ticket pages.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Could be a ticket, but it's still loading or is not an active tab.
  if (changeInfo.status != "complete" || !tab.active) {
    return;
  }

  // This is likely not a ticket, so disable the extension and return.
  if (
    !tab.url ||
    tab.url.search(
      /^https:\/\/[\-_A-Za-z0-9]+\.zendesk.com\/agent\/tickets\/[0-9]+/i
    ) == -1
  ) {
    browser.action.disable(tab.id);
    browser.action.setIcon({ path: "../icons/zlc-icon-disabled-16x16.png" });
    return;
  }

  // A new ticket is being viewed, so process it and enable the extension.
  isBackgroundProcessingEnabled().then((status) => {
    if (status) {
      filterTicket();
    }
  });
  browser.action.setIcon({ path: "../icons/zlc-icon-16x16.png" });
  browser.action.enable(tab.id);
});

// Listen for messages from the popup
browser.runtime.onMessage.addListener((message) => {
  if (message.type == "refresh") {
    filterTicket();
  }
});

// Listen for keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
  switch (command) {
    case "copy-ticket-id":
      // Logic to send a message to the contentscript to copy the ticket ID to the clipboard.
      // If background processing is disabled, send a message to the contentscript to indicate that copying is not possible.
      isBackgroundProcessingEnabled().then((status) => {
        if (!status) {
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              browser.tabs.sendMessage(tabs[0].id, {
                type: "copy-not-possible",
              });
            });
          return;
        }
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, { type: "copy-ticket-id" });
          });
      });
      break;
    case "copy-ticket-id-md":
      // Logic to send a message to the contentscript to copy the ticket ID to the clipboard in markdown.
      // If background processing is disabled, send a message to the contentscript to indicate that copying is not possible.
      isBackgroundProcessingEnabled().then((status) => {
        if (!status) {
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              browser.tabs.sendMessage(tabs[0].id, {
                type: "copy-not-possible",
              });
            });
          return;
        }
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, { type: "copy-ticket-id-md" });
          });
      });
      break;
    default:
      console.log(`Command ${command} not recognized.`);
  }
});

// TODO: Listen for ticket changed messages from the content script
