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
            const nodes = [];

            // Create table cells.
            // Create title cell.
            const tdTitle = document.createElement('td');
            const strong = document.createElement('strong')
            strong.textContent = option.title;
            tdTitle.appendChild(strong);
            nodes.push(tdTitle);

            // Create pattern cell.
            const tdPattern = document.createElement('td');
            const pre = document.createElement('pre')
            pre.textContent = option.pattern;
            tdPattern.appendChild(pre);
            nodes.push(tdPattern);

            // Create show parent cell.
            const tdContext = document.createElement('td');
            const checkboxContext = document.createElement('input');
            checkboxContext.setAttribute('type', 'checkbox');
            checkboxContext.setAttribute('disabled', 'true');
            checkboxContext.checked = option.showParent;
            tdContext.appendChild(checkboxContext);
            nodes.push(tdContext);

            // Create delete cell.
            const tdDelete = document.createElement('td');
            const buttonDelete = document.createElement('button')
            buttonDelete.textContent = 'Delete';
            tdDelete.appendChild(buttonDelete);
            nodes.push(tdDelete);

            // Create reorder cells.
            // Create up button.
            const tdReorder = document.createElement('td');
            const buttonReorderUp = document.createElement('button')
            buttonReorderUp.setAttribute('class', 'button-reorder-up');
            buttonReorderUp.textContent = 'Up';
            tdReorder.appendChild(buttonReorderUp);
            // Create down button.
            const buttonReorderDown = document.createElement('button')
            buttonReorderDown.setAttribute('class', 'button-reorder-down');
            buttonReorderDown.textContent = 'down';
            tdReorder.appendChild(buttonReorderDown);
            nodes.push(tdReorder);
            
            // Add cells to row.
            tr.append(...nodes);

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