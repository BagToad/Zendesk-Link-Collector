const div = document.createElement('div');
document.body.appendChild(div);

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
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "scroll", commentId: commentId});
  });

  // const type = 'scroll';
  // chrome.runtime.sendMessage({type, commentId});

  // const type = 'scroll'
  // const element = document.querySelector(`[data-comment-id="${commentId}"]`);
  // if (element) {
  //   element.scrollIntoView({ behavior: "smooth", block: "center" });
  // }
}

function fetchResource(input, init) {
    const type = 'fetch';
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type, input, init}, messageResponse => {
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

async function searchCommentsJSON(commentsJSON) {
    let linksArr = [];
    const attachmentsArr = [];
    const parser = new DOMParser();
    commentsJSON.comments.forEach(comments => {
        const doc = parser.parseFromString(comments.html_body, "text/html");
        const links = doc.querySelectorAll(`a`)
        if (links.length > 0) {
            links.forEach(link => {
                        linksArr.push({
                        created_at: comments.created_at,
                        parent_text: link.parentElement.innerHTML,
                        text: link.innerHTML,
                        href: link.href,
                        id: comments.id
                      })
            });
        }
        if (comments.attachments.length > 0) {
          attachmentsArr.push({
            id: comments.id,
            attachments: comments.attachments
          })
        }
        
    });

    // Filter all the links according to the rules.
    linksBundle = await filterLinks(linksArr);

    // Load the nice lists :)
    const linksList = document.getElementById('list-container-links');
    linksBundle.forEach(bundle => {
      linksList.innerHTML += `<h3 class="list-header list-header-links" >${bundle.title}</h3>`;
      html2add = `<ul class='list-links' id="list-${bundle.title}">`;
      // linksList.innerHTML += `<ul id="list-${bundle.title}">`;
      
      bundle.links.forEach(link => {
        if (bundle.showParent) {
          // linksList.innerHTML += `<li class="list-item-links"><i class="icon-search" id='${link.id}'></i>${link.parent_text}</li>`;
          html2add += `<li class="list-item-links"><i class="icon-search" id='${link.id}'></i>${link.parent_text}</li>`;
        } else {
          // linksList.innerHTML += `<li class="list-item-links"><i class="icon-search" id='${link.id}'></i><a target="_blank" href="${link.href}">${link.text}</a></li>`;
          html2add += `<li class="list-item-links"><i class="icon-search" id='${link.id}'></i><a target="_blank" href="${link.href}">${link.text}</a></li>`;
        }
      })
      // linksList.innerHTML += '</ul>'
      html2add += '</ul>'
      linksList.innerHTML += html2add;
      document.getElementById('list-container-links').querySelectorAll('i').forEach(i => {
        i.addEventListener('click', () => {scrollToComment(i.id)});
      })
    })

    // TODO Attachments


    console.log("attachments: ", attachmentsArr);
}

async function filterLinks(linksArr) {
  let filters = await chrome.storage.sync.get('options').then((data) => {
    if (data.options.length <= 0){
        data.options = [];
    }
    return data.options;;
  });
  // This is an array of objects with the following structure:
  // {
  //   title: "",
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


function updateUI(ticketURL, isZendesk) {
    if (! isZendesk) {
        console.log( ticketURL + " is not a zendesk ticket");
        div.innerHTML = 'This is not a Zendesk ticket';
        return;
    }
    console.log(ticketURL + " is a zendesk ticket");
    div.innerHTML = 'This is a Zendesk ticket';
}

async function getCurrentTabURL() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return new URL(tab.url);
}

function parseTicketID(url) {
    const stringArr = url.split('/')
    return stringArr[stringArr.length - 1];
}

getCurrentTabURL().then(url => {
    if (url.href.search(/https:\/\/[A-z0-9]+.zendesk.com\/agent\/tickets\/[0-9]+/i) >= 0) {
        const ticketID = parseTicketID(url.href)
        fetchResource(`https://${url.hostname}/api/v2/tickets/${ticketID}/comments`)
        .then(response => response.json())
        .then(data => {
          searchCommentsJSON(data);
        })
        .catch(error => {
          console.error('Request failed:', error);
        });
        updateUI(url, true);

    } else {
        updateUI(url, false);
    }
});





