importScripts('../lib/browser-polyfill.min.js');

// Code from https://stackoverflow.com/questions/55214828/how-to-make-a-cross-origin-request-in-a-content-script-currently-blocked-by-cor/55215898#55215898
async function fetchResource(input, init) {
    const type = 'fetch';
    return new Promise((resolve, reject) => {
        browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {type, input, init}).then(messageResponse => {
                const [response, error] = messageResponse;
                if (response === null) {
                    reject(error);
                } else {
                    // Use undefined on a 204 - No Content
                    const body = response.body ? new Blob([response.body]) : undefined;
                    resolve(new Response(body, {
                        status: response.status,
                        statusText: response.statusText,
                    }));
                }
            });
        })
    });
}

// Parse the HTML text and return an array of links.
async function parseAElementsFromHTMLText(htmlText) {
    const type = 'parse-html-a';
    const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    const response = await chrome.tabs.sendMessage(tab.id, {type: type, htmlText: htmlText});
    return response;
}

// Fetch ticket data, fetch settings, process the ticket, then store the result.
// This function is called when the extension is first loaded, when the ticket is changed, and when the settings are changed.
// There are three sections to this function:
// 1. Comment collecting loop section - collects all comments from the ticket.
// 2. Custom field link collecting section - collects all links from custom fields.
// 3. Link filtering section - filters the links based on the settings.
async function filterTicket() {
    await browser.storage.local.set(
        {
            ticketStorage: {
                links: [],
                attachments: [],
                state: 'loading'
            }
        }
    );

    // Get the current active tab.
    const queryOptions = { active: true, lastFocusedWindow: true };
    const [tab] = await browser.tabs.query(queryOptions);

    // Get make a real URL from the text URL.
    const url = new URL(tab.url);
    
    // Get the ticket ID from the URL.
    const stringArr = url.href.split('/')
    const ticketID = stringArr[stringArr.length - 1];
    
    // Comment collecting loop section
    // *******************************
    const rlimit = 25; // Max number of requests to make.
    const firstPage = `https://${url.hostname}/api/v2/tickets/${ticketID}/comments`; // URL of the first page of comments.
    let nextPage = firstPage; // URL of the next page of comments.
    let r = 1; // Number of requests made.
    
    const linksArr = []; // Array of link objects to be displayed.
    const attachmentsArr = []; // Array of attachment objects to be displayed.

    // Loop through all pages of comments until there are no more pages.
    while (nextPage != '' && r <= rlimit) {
        console.log(`Processing request #${r}`);
        r++;
        const response = await fetchResource(nextPage)
        .catch(error => {
            console.error('Request failed:', error);
        });       
        const commentData = await response.json();
        if (commentData.next_page != null) {
            nextPage = commentData.next_page;
        } else {
            nextPage = '';
        }
        
        //Grab only the required fields from the JSON.   
        await commentData.comments.forEach(async comments => {
            // Parse the HTML text and return an array of links.
            const links = await parseAElementsFromHTMLText(comments.html_body);
            // Push the required link information to the linksArr.
            if (links.length > 0) {
                links.forEach(link => {
                    linksArr.push({
                        commentID: comments.id,
                        auditID: comments.audit_id,
                        createdAt: comments.created_at,
                        parent_text: link.parent_text,
                        text: link.text,
                        href: link.href
                    })
                });
            }

            // Push the required attachment information to the attachmentsArr.
            if (comments.attachments.length > 0) {
                attachmentsArr.push({
                  commentID: comments.id,
                  auditID: comments.audit_id,
                  created_at: comments.created_at,
                  attachments: comments.attachments
                })
            }
        });
    }

    // Custom field link collecting section.
    // *************************************
    const response = await fetchResource(`https://${url.hostname}/api/v2/tickets/${ticketID}`)
    .catch(error => {
        console.error('Request failed:', error);
    });
    const ticketData = await response.json();
    const customFields = ticketData.ticket.custom_fields;

    // For each custom field, check if it is a string and if it contains a link.
    customFields.forEach(field => {
        if (field.value != null && typeof field.value == 'string') {
        field.value.split(/[\n\s]/g).forEach(valueArrItem => {
            // If the value is a link, add it to the linksArr for filtering.
            if (valueArrItem.search(/^https?:\/\//i) >= 0) {
            console.log(`found link in custom field: ${valueArrItem}`)
            linksArr.push({
                createdAt: null,
                text: valueArrItem,
                href: valueArrItem
            });
            }
        });
        }
    });

    // Link filtering section - this is where the magic (regex) happens.
    // ****************************************************************
    const filters = await browser.storage.sync.get('options').then((optionsStorage) => {
        if (optionsStorage.options == undefined || optionsStorage.options.length <= 0){
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
    filters.forEach(filter => {
        const filteredLinksArr = [];
        linksArr.forEach(link => {
            const re = new RegExp(filter.pattern)
            if (re.test(link.href)) {
            link.summaryType = filter.summaryType === undefined ? "all" : filter.summaryType;
            filteredLinksArr.push(link);
            }
        });

        // Remove duplicates. Keep the latest.
        const filteredLinksArrUnique = [];
        filteredLinksArr.forEach(link => {
            const found = filteredLinksArrUnique.find(l => l.href == link.href);
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
        
        if (filteredLinksArrUnique.length > 0) {
            filteredLinks.push({
            title: filter.title,
            showParent: filter.showParent,
            links: filteredLinksArrUnique
            });
        }
    });

    console.log("filtered links: ", filteredLinks);
    console.log("attachments: ", attachmentsArr);

    // Store the filtered links and attachments for the current ticket in the browser storage.
    browser.storage.local.set(
        {
            ticketStorage: {
                links: filteredLinks,
                attachments: attachmentsArr,
                state: 'complete'
            }
        }
    );
}

// A new browser tab is active.
// This is used to detect when a new ticket is being viewed.
// Filter out events from active tabs that are not ticket pages.
browser.tabs.onActivated.addListener((activeTab) => {
    browser.tabs.get(activeTab.tabId).then((tab) => {
        // Only process ticket pages.
        // Disable extension and change icon to grey if not a ticket page.
        if (! tab.url || tab.url.search(/^https:\/\/[\-_A-Za-z0-9]+\.zendesk.com\/agent\/tickets\/[0-9]+/i) == -1) {
            browser.action.disable(tab.id);
            browser.action.setIcon({path: '../icons/zlc-icon-disabled-16x16.png'});
            return;
        }
        // A new ticket is being viewed, so process it and enable the extension.
        filterTicket();
        browser.action.setIcon({path: '../icons/zlc-icon-16x16.png'});
        browser.action.enable(tab.id);
    });
});

// A browser tab is updated. 
// This is used to detect when a new ticket is being viewed.
// Filter out events from tabs that are not active, or are not ticket pages.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Could be a ticket, but it's still loading or is not an active tab.
    if (changeInfo.status != 'complete' || ! tab.active) {
        return;
    }

    // This is likely not a ticket, so disable the extension and return.
    if (! tab.url || tab.url.search(/^https:\/\/[\-_A-Za-z0-9]+\.zendesk.com\/agent\/tickets\/[0-9]+/i) == -1) {
        browser.action.disable(tab.id);
        browser.action.setIcon({path: '../icons/zlc-icon-disabled-16x16.png'});
        return;
    }
    
    // A new ticket is being viewed, so process it and enable the extension.
    filterTicket();
    browser.action.setIcon({path: '../icons/zlc-icon-16x16.png'});
    browser.action.enable(tab.id);
});

// Monitor settings changes in the options storage, then reprocess the ticket.
browser.storage.onChanged.addListener((changed) => {
    // If the link patterns have changed, reprocess the ticket.
    if (changed.status == 'complete') {
        console.log('Settings changed, reprocessing ticket');
        filterTicket();
    }
});

// Listen for ticket changed messages from the content script

// 