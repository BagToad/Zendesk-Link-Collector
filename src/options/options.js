// LATER:
// - Edit?

// Load link patterns into the link patterns table.
function loadLinkPatterns() {
  const linkTable = document.getElementById("table-link-patterns").tBodies[0];
  linkTable.innerHTML = "";
  browser.storage.sync.get("options").then((data) => {
    if (data.options == undefined || data.options.length <= 0) {
      data.options = [];
    }
    data.options.forEach((option) => {
      // Create table row.
      const tr = document.createElement("tr");
      tr.id = option.id;

      // Initialize node types.
      const nodes = [];

      // Create table cells.
      // Create title cell.
      const tdTitle = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = option.title;
      tdTitle.appendChild(strong);
      nodes.push(tdTitle);

      // Create pattern cell.
      const tdPattern = document.createElement("td");
      const pre = document.createElement("pre");
      pre.textContent = option.pattern;
      tdPattern.appendChild(pre);
      nodes.push(tdPattern);

      // Create show parent cell.
      const tdContext = document.createElement("td");
      const checkboxContext = document.createElement("input");
      checkboxContext.setAttribute("type", "checkbox");
      checkboxContext.setAttribute("disabled", "true");
      checkboxContext.checked = option.showParent;
      tdContext.appendChild(checkboxContext);
      nodes.push(tdContext);

      // Create summary type cell.
      const tdSummaryType = document.createElement("td");
      if (option.summaryType == "all") {
        tdSummaryType.textContent = "All";
      } else if (option.summaryType == "latest") {
        tdSummaryType.textContent = "Latest";
      } else if (option.summaryType == "none") {
        tdSummaryType.textContent = "None";
      } else if (option.summaryType == undefined) {
        tdSummaryType.textContent = "All";
      } else {
        tdSummaryType.textContent = `Unknown (${option.summaryType})`;
      }
      nodes.push(tdSummaryType);

      // Create show parent cell.
      const tdDate = document.createElement("td");
      const checkboxDate = document.createElement("input");
      checkboxDate.setAttribute("type", "checkbox");
      checkboxDate.setAttribute("disabled", "true");
      checkboxDate.checked = option.showDate;
      tdDate.appendChild(checkboxDate);
      nodes.push(tdDate);

      // Create edit cell.
      const tdEdit = document.createElement("td");
      const buttonEdit = document.createElement("button");
      buttonEdit.textContent = "Edit";
      buttonEdit.addEventListener("click", () => editLinkPattern(option.id));
      tdEdit.appendChild(buttonEdit);
      nodes.push(tdEdit);

      // Create delete cell.
      const tdDelete = document.createElement("td");
      const buttonDelete = document.createElement("button");
      buttonDelete.textContent = "Delete";
      tdDelete.appendChild(buttonDelete);
      nodes.push(tdDelete);

      // Create reorder cells.
      // Create up button.
      const tdReorder = document.createElement("td");
      const buttonReorderUp = document.createElement("button");
      buttonReorderUp.setAttribute("class", "button-reorder-up");
      buttonReorderUp.textContent = "Up";
      tdReorder.appendChild(buttonReorderUp);
      // Create down button.
      const buttonReorderDown = document.createElement("button");
      buttonReorderDown.setAttribute("class", "button-reorder-down");
      buttonReorderDown.textContent = "Down";
      tdReorder.appendChild(buttonReorderDown);
      nodes.push(tdReorder);

      // Add cells to row.
      tr.append(...nodes);

      // Add row to table.
      linkTable.appendChild(tr);

      //Add event listeners to dynamic elements.
      document
        .querySelector(`[id = '${option.id}'] td button`)
        .addEventListener("click", () => deleteLink(option.id));
      document
        .querySelector(`[id = '${option.id}'] td button.button-reorder-up`)
        .addEventListener("click", () => reorderLinkPattern(option.id, -1));
      document
        .querySelector(`[id = '${option.id}'] td button.button-reorder-down`)
        .addEventListener("click", () => reorderLinkPattern(option.id, 1));
    });
  });
}

// Set the error message for the link patterns input. If err is empty, hide the error message.
function setLinkPatternError(err) {
  document.getElementById("link-patterns-error").textContent = err;
  if (err != "" && err != undefined) {
    document.getElementById("link-patterns-error").classList.remove("hidden");
    console.log("here");
    return;
  }
  document.getElementById("link-patterns-error").classList.add("hidden");
}

// Save a new link pattern from user input values.
function saveLinkPatterns() {
  if (document.getElementById("title").value == "") {
    setLinkPatternError("Missing required field: Title");
    return;
  }
  if (document.getElementById("pattern").value == "") {
    setLinkPatternError("Missing required field: RegEx Pattern");
    return;
  }

  // Get existing link options to append to.
  browser.storage.sync.get("options").then((data) => {
    // Hide previous error messages.
    setLinkPatternError("");
    // Initialize options if none exist.
    if (data.options == undefined || data.options.length <= 0) {
      data.options = [];
    }
    // Validate RegEx.
    try {
      new RegExp(document.getElementById("pattern").value);
    } catch (SyntaxError) {
      setLinkPatternError(
        "Invalid RegEx pattern! - Great work! That's difficult to do! :D"
      );
      console.error("Invalid RegEx");
      return;
    }
    // Add new link pattern to data.
    data.options.push({
      id: crypto.randomUUID(),
      title: document.getElementById("title").value,
      pattern: document.getElementById("pattern").value,
      showParent: document.getElementById("show-parent").checked,
      summaryType: document.getElementById("summary-type").value,
      showDate: document.getElementById("show-date").checked,
    });
    // Save new link pattern to disk.
    browser.storage.sync.set({ options: data.options }).then(() => {
      // Load the new patterns table.
      loadLinkPatterns();
      // Reset input fields.
      document.getElementById("title").value = "";
      document.getElementById("pattern").value = "";
      document.getElementById("show-parent").checked = false;
      document.getElementById("summary-type").value = "none";
      document.getElementById("show-date").checked = false;
    });
  });
}

// Edit a link pattern from the link patterns table.
function editLinkPattern(id) {
  browser.storage.sync.get("options").then((data) => {
    if (data.options.length <= 0) {
      //Shouldn't happen?
      return;
    }
    data.options.forEach((option) => {
      if (option.id == id) {
        // Fill the input fields with the selected link pattern's current values.
        document.getElementById("title").value = option.title;
        document.getElementById("pattern").value = option.pattern;
        document.getElementById("show-parent").checked = option.showParent;
        document.getElementById("summary-type").value = option.summaryType;
        document.getElementById("show-date").checked = option.showDate;

        // Disable all edit buttons except for the current editing one.
        document.querySelectorAll("button").forEach((button) => {
          if (button.textContent == "Edit" && button.parentElement.parentElement.id != id) {
            button.disabled = true;
          }
        });

        // Change the save button text to indicate editing is occurring.
        document.getElementById("button-save-link-patterns").textContent = "Save Edit";

        // Add an event listener to the save button to handle saving the edit.
        document.getElementById("button-save-link-patterns").addEventListener("click", () => saveEdit(id));
      }
    });
  });
}

// Save the edited link pattern.
function saveEdit(id) {
  browser.storage.sync.get("options").then((data) => {
    if (data.options.length <= 0) {
      //Shouldn't happen?
      return;
    }
    data.options.forEach((option, index) => {
      if (option.id == id) {
        // Update the link pattern with the new values from the input fields.
        data.options[index].title = document.getElementById("title").value;
        data.options[index].pattern = document.getElementById("pattern").value;
        data.options[index].showParent = document.getElementById("show-parent").checked;
        data.options[index].summaryType = document.getElementById("summary-type").value;
        data.options[index].showDate = document.getElementById("show-date").checked;

        // Save the updated link pattern to disk.
        browser.storage.sync.set({ options: data.options }).then(() => {
          // Load the updated patterns table.
          loadLinkPatterns();

          // Reset input fields.
          document.getElementById("title").value = "";
          document.getElementById("pattern").value = "";
          document.getElementById("show-parent").checked = false;
          document.getElementById("summary-type").value = "none";
          document.getElementById("show-date").checked = false;

          // Re-enable all edit buttons.
          document.querySelectorAll("button").forEach((button) => {
            if (button.textContent == "Edit") {
              button.disabled = false;
            }
          });

          // Change the save button text back to its original state.
          document.getElementById("button-save-link-patterns").textContent = "Save Link Pattern";
        });
      }
    });
  });
}

// Export/Download link patterns as JSON.
function downloadLinkPatternsJSON() {
  browser.storage.sync.get("options").then((data) => {
    if (data.options == undefined || data.options.length <= 0) {
      return;
    }
    const blob = new Blob([JSON.stringify(data.options)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "link-patterns.json";
    link.click();
    URL.revokeObjectURL(url);
  });
}

// Import link patterns from JSON.
function importLinkPatternsJSON() {
  const inputElement = document.getElementById("link-patterns-import-file");
  const file = inputElement.files[0];
  const fileReader = new FileReader();

  // Clear input.
  document.getElementById("link-patterns-import-file").value = "";

  fileReader.readAsText(file, "UTF-8");
  fileReader.onload = function () {
    const fileContent = fileReader.result;
    const newOptions = JSON.parse(fileContent);
    const overwrite =
      document.getElementById("link-patterns-import-type").value == "overwrite"
        ? true
        : false;
    // Validate the JSON data.

    newOptions.forEach((option) => {
      // Check for missing fields.
      if (
        option.id == undefined ||
        option.title == undefined ||
        option.pattern == undefined ||
        option.showParent == undefined
      ) {
        console.error("Invalid JSON data (missing fields)");
        return;
      }
      // Set default summary type if not found.
      if (option.summaryType == undefined) {
        option.summaryType = "all";
      }
      // Always set new ID to avoid duplicates.
      option.id = crypto.randomUUID();
      // Validate RegEx.
      try {
        new RegExp(option.pattern);
      } catch (SyntaxError) {
        console.error("Invalid JSON data (bad pattern)");
        return;
      }
    });

    // Add to existing data.
    if (!overwrite) {
      browser.storage.sync.get("options").then((data) => {
        if (data.options == undefined || data.options.length <= 0) {
          data.options = [];
        }
        data.options.push(...newOptions);
        browser.storage.sync.set({ options: data.options }).then(() => {
          loadLinkPatterns();
        });
      });
      return;
    }

    browser.storage.sync.set({ options: newOptions }).then(() => {
      loadLinkPatterns();
    });
  };

  fileReader.onerror = function () {
    console.error("Unable to read file");
  };
}

// Save the global extension options from user inputs.
function saveGlobalOptions() {
  browser.storage.sync.get("optionsGlobal").then((data) => {
    if (data.optionsGlobal == undefined) {
      data.optionsGlobal = {
        wrapLists: false,
      };
    }

    data.optionsGlobal.wrapLists =
      document.getElementById("wrap-lists").checked;

    browser.storage.sync.set({
      optionsGlobal: optionsGlobal,
    });
  });
}

// Load the global extension options into the list of global options.
function loadGlobalOptions() {
  browser.storage.sync.get("optionsGlobal").then((data) => {
    if (data.optionsGlobal == undefined) {
      data.optionsGlobal = {
        wrapLists: false,
      };
    }
    document.getElementById("wrap-lists").checked =
      data.optionsGlobal.wrapLists;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners to static elements.
  // Global options event listeners.
  document
    .getElementById("button-save-global-options")
    .addEventListener("click", () => saveGlobalOptions());
  loadGlobalOptions();

  // Link patterns event listeners.
  document
    .getElementById("button-save-link-patterns")
    .addEventListener("click", () => saveLinkPatterns());
  document
    .getElementById("link-patterns-import")
    .addEventListener("click", () => importLinkPatternsJSON());
  document
    .getElementById("link-patterns-export")
    .addEventListener("click", () => downloadLinkPatternsJSON());
  loadLinkPatterns();
});
