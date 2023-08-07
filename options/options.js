// LATER:
// - Edit?

function deleteLink(id) {
    browser.storage.sync.get('options').then(data => {
        if (data.options.length <= 0){
            //Shouldn't happen?
            return;
        }
        data.options.forEach((option) => {
            if (option.id == id) {
                data.options.splice(data.options.indexOf(option), 1);
            }
        });
        browser.storage.sync.set({options: data.options}).then( () => {
            load();
        });
    });
}

function load() {
    const linkTable = document.getElementById('table-link-patterns').tBodies[0];
    linkTable.innerHTML = '';
    browser.storage.sync.get('options').then(data => {
        if (data.options == undefined || data.options.length <= 0){
            data.options = [];
        }
        data.options.forEach(option => {
            // Create table row.
            const tr = document.createElement('tr');
            tr.id = option.id;

            // Initialize node types.
            let nodes = [];
            let td = '';
            let strong = '';
            let pre = '';
            let input = '';

            // Create table cells.
            // Create title cell.
            td = document.createElement('td');
            strong = document.createElement('strong')
            strong.textContent = option.title;
            td.appendChild(strong);
            nodes.push(td);

            // Create pattern cell.
            td = document.createElement('td');
            pre = document.createElement('pre')
            pre.textContent = option.pattern;
            td.appendChild(pre);
            nodes.push(td);

            // Create show parent cell.
            td = document.createElement('td');
            input = document.createElement('input');
            input.setAttribute('type', 'checkbox');
            input.setAttribute('disabled', 'true');
            input.checked = option.showParent;
            td.appendChild(input);
            nodes.push(td);

            // Create delete cell.
            td = document.createElement('td');
            button = document.createElement('button')
            button.textContent = 'Delete';
            td.appendChild(button);
            nodes.push(td);

            // Create reorder cells.
            // Create up button.
            td = document.createElement('td');
            button = document.createElement('button')
            button.setAttribute('class', 'button-reorder-up');
            button.textContent = 'Up';
            td.appendChild(button);
            // Create down button.
            button = document.createElement('button')
            button.setAttribute('class', 'button-reorder-down');
            button.textContent = 'down';
            td.appendChild(button);
            nodes.push(td);
            
            // Add cells to row.
            nodes.forEach(node => {
                tr.appendChild(node);
            });

            // Add row to table.
            linkTable.appendChild(tr)

            //Add event listeners to dynamic elements.
            document.querySelector(`[id = '${option.id}'] td button`).addEventListener('click', () => deleteLink(option.id));
            document.querySelector(`[id = '${option.id}'] td button.button-reorder-up`).addEventListener('click', () => reorder(option.id, -1));
            document.querySelector(`[id = '${option.id}'] td button.button-reorder-down`).addEventListener('click', () => reorder(option.id, 1));
        });
    });
}

function save() {
    browser.storage.sync.get('options').then(data => {
        if (data.options == undefined || data.options.length <= 0) {
            data.options = [];
        }
        data.options.push({
            id: Date.now(),
            title: document.getElementById('title').value,
            pattern: document.getElementById('pattern').value,
            showParent: document.getElementById('show-parent').checked
        })
        browser.storage.sync.set({options: data.options}).then( () => {
            load();
            document.getElementById('title').value = '';
            document.getElementById('pattern').value = '';
            document.getElementById('show-parent').checked = false;
        });
    });
    
}

function reorder(id, move) {
    browser.storage.sync.get('options').then(data => {
        if (data.options.length <= 0){
            //Shouldn't happen?
            return;
        }
        if (move == 0 || move == undefined) {
            //No move.
            return;
        }
        let found = false;
        data.options.forEach((option) => {
            if (option.id == id && !found) {
                found = true;
                let pOptionIndex = data.options.indexOf(option) + move;
                if (pOptionIndex < 0 || pOptionIndex >= data.options.length) {
                    //OOB array.
                    console.error("OOB array");
                    return;
                }
                let option2Move = data.options.splice(data.options.indexOf(option), 1)[0];
                data.options.splice(pOptionIndex, 0, option2Move);
            }
        });
        
        browser.storage.sync.set({options: data.options}).then( () => {
            load();
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('save-button').addEventListener('click', () => save());
    load();
});