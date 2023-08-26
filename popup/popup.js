document.getElementById('button-links').addEventListener('click', () => {
  document.getElementById('button-links').classList.add('checked');
  document.getElementById('list-container-links').classList.add('selected');

  document.getElementById('button-attachments').classList.remove('checked');
  document.getElementById('list-container-attachments').classList.remove('selected');
});

document.getElementById('button-attachments').addEventListener('click', () => {
  document.getElementById('button-links').classList.remove('checked');
  document.getElementById('list-container-links').classList.remove('selected');

  document.getElementById('button-attachments').classList.add('checked');
  document.getElementById('list-container-attachments').classList.add('selected');
});


function scrollToComment(commentId) {
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    browser.tabs.sendMessage(tabs[0].id, {type: "scroll", commentId: commentId});
  });
}

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

async function displayLinks(commentsJSON) {
    const linksArr = [];
    const parser = new DOMParser();

    commentsJSON.comments.forEach(comments => {
        const doc = parser.parseFromString(comments.html_body, "text/html");
        const links = doc.querySelectorAll(`a`)
        if (links.length > 0) {
            links.forEach(link => {
                        linksArr.push({
                        id: comments.id,
                        created_at: comments.created_at,
                        parent_text: link.parentElement.innerHTML,
                        text: link.innerText,
                        href: link.href
                      })
            });
        }
    });

    // Filter all the links according to the rules.
    const linksBundle = await filterLinks(linksArr);

    // Get list container
    const linksList = document.getElementById('list-container-links');

    // For each bundle, create a header and the list of links.
    linksBundle.forEach(bundle => {

      //Check for existing header
      // let header;
      let ul;
      let foundHeader = false;

      if (document.getElementById(`header-${bundle.title}`) != null) {
        // header = document.getElementById(`header-${bundle.title}`);
        ul = document.getElementById(`list-${bundle.title}`);
        foundHeader = true;
      } else {
        // Create header.
        const header = document.createElement('h3');
        header.setAttribute('class', 'list-header list-header-links');
        header.setAttribute('id', `header-${bundle.title}`);
        header.textContent = bundle.title;
        linksList.appendChild(header);

        // Create list.
        ul = document.createElement('ul');
        ul.setAttribute('class', 'list-links');
        ul.setAttribute('id', `list-${bundle.title}`);
      }
      // For each link in bundle, create a list item.
      bundle.links.forEach(link => {
        // Create the list item.
        const li = document.createElement('li');
        li.setAttribute('class', 'list-item-links');

        // Create the icon and append to list item.
        const i = document.createElement('i');
        i.setAttribute('class', 'icon-search');
        i.setAttribute('id', link.id);
        li.appendChild(i);

        // Add link content or parent context to list item.
        if (bundle.showParent) {
          // Parse the parent context as HTML and append to list item.
          // (Parent context is returned from Zendesk API as plain text)
          const parser = new DOMParser();
          const doc = parser.parseFromString(link.parent_text, "text/html");

          // Need to add `target="_blank"` to all links in the parent context.
          // Otherwise, they do not open in a tab.
          doc.querySelectorAll(`a`).forEach(a => {
            a.setAttribute('target', '_blank');
          });
          
          const nodes = doc.getElementsByTagName('body')[0].childNodes;
          li.append(...nodes);
        } else {
          const a = document.createElement('a');
          a.setAttribute('target', '_blank');
          a.setAttribute('href', link.href);
          a.textContent = link.text;
          li.appendChild(a);
        }
        ul.appendChild(li);
      })

      // Only append the ul to a header if it has not been done previously. 
      if (!foundHeader) {
        linksList.appendChild(ul);
      }

      document.getElementById('list-container-links').querySelectorAll('i').forEach(i => {
        i.addEventListener('click', () => {scrollToComment(i.id)});
      })
    })
}

async function displayAttachments(commentsJSON) {

  const attachmentsArr = [];
  commentsJSON.comments.forEach(comments => {
    if (comments.attachments.length > 0) {
      attachmentsArr.push({
        id: comments.id,
        created_at: comments.created_at,
        attachments: comments.attachments
      })
    }  
  });

  // Create and display attachments list.

  // Get attachments container.
  const attachmentsList = document.getElementById('list-container-attachments');

  const ul = document.createElement('ul');
  ul.setAttribute('class', 'list-attachments');

  // For each comment, create a top-level list item.
  attachmentsArr.forEach(comment => {
    const liDate = document.createElement('li');
    liDate.setAttribute('class', 'list-item-attachments');
    const txtDate = document.createTextNode(`Comment on: ${comment.created_at}`);

    // Create the icon and append to list item.
    const i = document.createElement('i');
    i.setAttribute('class', 'icon-search');
    i.setAttribute('id', comment.id);
    liDate.append(i, txtDate);

    const ulComment = document.createElement('ul');
    ulComment.setAttribute('class', 'list-attachments');

    // For each attachment, create a list item and append to top-level list item.
    comment.attachments.forEach(attachment => {
      const liAttachment = document.createElement('li');
      liAttachment.setAttribute('class', 'list-item-attachments');
      const aAttachment = document.createElement('a');
      aAttachment.setAttribute('target', '_blank');
      aAttachment.setAttribute('href', attachment.content_url);
      aAttachment.textContent = attachment.file_name;

      liAttachment.appendChild(aAttachment);
      ulComment.appendChild(liAttachment);
      liDate.appendChild(ulComment);
    });

    ul.appendChild(liDate);
    attachmentsList.appendChild(ul);
  });

  document.getElementById('list-container-attachments').querySelectorAll('i').forEach(i => {
    i.addEventListener('click', () => {scrollToComment(i.id)});
  })
}

async function filterLinks(linksArr) {
  let filters = await browser.storage.sync.get('options').then((data) => {
    if (data.options == undefined || data.options.length <= 0){
        data.options = [];
    }
    return data.options;;
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
        filteredLinksArr.push(link);
      }
    })
    if (filteredLinksArr.length > 0) {
      filteredLinks.push({
        title: filter.title,
        showParent: filter.showParent,
        links: filteredLinksArr
      });
    }
  })
  return filteredLinks;
}

async function getCurrentTabURL() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await browser.tabs.query(queryOptions);
    return new URL(tab.url);
}

function parseTicketID(url) {
    const stringArr = url.split('/')
    return stringArr[stringArr.length - 1];
}

getCurrentTabURL().then(async url => {
    if (url.href.search(/^https:\/\/[\-_A-Za-z0-9]+\.zendesk.com\/agent\/tickets\/[0-9]+/i) >= 0) {
        const rlimit = 25; // Max number of requests to make.
        const ticketID = parseTicketID(url.href);
        const firstPage = `https://${url.hostname}/api/v2/tickets/${ticketID}/comments`;
        let nextPage = firstPage;
        let r = 0; // Number of requests made.

        while (nextPage != '' && r < rlimit) {
          r++;
          let response = await fetchResource(nextPage)
          .catch(error => {
            console.error('Request failed:', error);
          });

          let data = await response.json();

          if (data.next_page != null) {
            nextPage = data.next_page;
          } else {
            nextPage = '';
          }

          displayLinks(data);
          displayAttachments(data);
          
        }
        return;
    }
});





