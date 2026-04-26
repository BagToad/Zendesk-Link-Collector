// LATER:
// - Edit?

// Single-step undo for the most recent rule mutation.
//
// Scope is deliberately narrow: only delete, inline-edit, add (Save
// Link Pattern), example-import (one-click add from the Examples
// table), and import (JSON file) produce a snapshot. Reorder *clears*
// the snapshot rather than push a new one, so the user can never
// click Undo and silently lose an unrelated mutation they did in
// between. (The user explicitly asked for "undo just the LAST
// destructive change to a rule" — single-step, narrow.)
//
// State is module-local — closing the page drops it. That matches the
// typical scope of a UI-level undo and avoids reasoning about a stale
// snapshot persisted across browser sessions.
//
// The snapshot is a deep clone of the full `options` array prior to
// the mutation. The full-array shape keeps the undo path trivial:
// write the snapshot back, no per-rule diff logic. Imports (which
// can replace the entire table) reuse this same shape — overwrite
// and append both look like "the array was X, now it's Y".
let rulesLastMutation = null;

// type: "delete" | "edit" | "import"
// detail: for delete/edit the rule title; for import the mode
//         ("overwrite" or "append") so the label can disambiguate.
function setRulesLastMutation(type, detail, priorOptions) {
  rulesLastMutation = { type, detail, priorOptions };
  renderRulesUndoRegion();
}

function clearRulesLastMutation() {
  if (rulesLastMutation === null) return;
  rulesLastMutation = null;
  renderRulesUndoRegion();
}

function renderRulesUndoRegion() {
  const btn = document.getElementById("rules-undo-btn");
  if (!btn) return;
  // Glyph-only label — the descriptive text lives on aria-label and
  // title (set below) so screen readers and hover still get the full
  // context, but no English word is presented visually.
  btn.textContent = "↶";
  if (!rulesLastMutation) {
    // Always rendered; the disabled state is what communicates
    // "nothing to undo" to sighted users (dimmed via .btn:disabled).
    btn.disabled = true;
    btn.setAttribute("aria-label", "Undo last rule change");
    btn.setAttribute("title", "Nothing to undo");
    return;
  }
  btn.disabled = false;
  let label;
  if (rulesLastMutation.type === "import") {
    label = `Undo import (${rulesLastMutation.detail})`;
  } else {
    // delete | edit | add — detail is the rule title.
    const verb = rulesLastMutation.type;
    label = `Undo ${verb} of "${rulesLastMutation.detail}"`;
  }
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
}

function undoLastRulesMutation() {
  if (!rulesLastMutation) return;
  // Capture before clearing in case the storage write fails — we want
  // the button to remain available so the user can try again.
  const snapshot = rulesLastMutation.priorOptions;
  browser.storage.sync.set({ options: snapshot }).then(() => {
    clearRulesLastMutation();
    loadLinkPatterns();
  });
}

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
      // Each cell gets a `cell--<name>` class hook so the inline-edit code
      // can find the cell by name, not by numeric index. (Reordering columns
      // shouldn't silently mis-route the saved values.)
      // Create title cell.
      const tdTitle = document.createElement("td");
      tdTitle.className = "cell--title";
      const strong = document.createElement("strong");
      strong.textContent = option.title;
      tdTitle.appendChild(strong);
      nodes.push(tdTitle);

      // Create pattern cell.
      const tdPattern = document.createElement("td");
      tdPattern.className = "cell--pattern";
      const pre = document.createElement("pre");
      pre.textContent = option.pattern;
      // Show the full pattern on hover when it's been visually clipped.
      pre.setAttribute("title", option.pattern);
      tdPattern.appendChild(pre);
      nodes.push(tdPattern);

      // Create show parent cell.
      const tdContext = document.createElement("td");
      tdContext.className = "cell--context";
      const checkboxContext = document.createElement("input");
      checkboxContext.setAttribute("type", "checkbox");
      checkboxContext.setAttribute("disabled", "true");
      checkboxContext.checked = option.showParent;
      tdContext.appendChild(checkboxContext);
      nodes.push(tdContext);

      // Create summary type cell.
      const tdSummaryType = document.createElement("td");
      tdSummaryType.className = "cell--summary";
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

      // Create show date cell.
      const tdDate = document.createElement("td");
      tdDate.className = "cell--date";
      const checkboxDate = document.createElement("input");
      checkboxDate.setAttribute("type", "checkbox");
      checkboxDate.setAttribute("disabled", "true");
      checkboxDate.checked = option.showDate;
      tdDate.appendChild(checkboxDate);
      nodes.push(tdDate);

      // Create reorder cells.
      // Create up button.
      const tdReorder = document.createElement("td");
      tdReorder.className = "cell--reorder";
      const buttonReorderUp = document.createElement("button");
      buttonReorderUp.setAttribute("class", "button-reorder-up");
      buttonReorderUp.textContent = "▲";
      buttonReorderUp.setAttribute("title", "Move up");
      buttonReorderUp.setAttribute("aria-label", "Move up");
      tdReorder.appendChild(buttonReorderUp);
      // Create down button.
      const buttonReorderDown = document.createElement("button");
      buttonReorderDown.setAttribute("class", "button-reorder-down");
      buttonReorderDown.textContent = "▼";
      buttonReorderDown.setAttribute("title", "Move down");
      buttonReorderDown.setAttribute("aria-label", "Move down");
      tdReorder.appendChild(buttonReorderDown);
      nodes.push(tdReorder);

      // Create edit cell. Click toggles the row into inline-edit mode; once
      // editing, the same button (now ✓) saves the row's changes.
      const tdEdit = document.createElement("td");
      tdEdit.className = "cell--edit";
      const buttonEdit = document.createElement("button");
      buttonEdit.textContent = "✏️";
      buttonEdit.setAttribute("class", "button-edit");
      buttonEdit.setAttribute("title", "Edit");
      buttonEdit.setAttribute("aria-label", `Edit ${option.title}`);
      buttonEdit.addEventListener("click", () =>
        editLinkPatternInline(option.id)
      );
      tdEdit.appendChild(buttonEdit);
      nodes.push(tdEdit);

      // Create delete cell.
      const tdDelete = document.createElement("td");
      tdDelete.className = "cell--delete";
      const buttonDelete = document.createElement("button");
      buttonDelete.setAttribute("class", "button-delete");
      buttonDelete.textContent = "🗑️";
      buttonDelete.setAttribute("title", "Delete");
      buttonDelete.setAttribute("aria-label", `Delete ${option.title}`);
      tdDelete.appendChild(buttonDelete);
      nodes.push(tdDelete);

      // Add cells to row.
      tr.append(...nodes);

      // Add row to table.
      linkTable.appendChild(tr);

      //Add event listeners to dynamic elements.
      document
        .querySelector(`[id = '${option.id}'] td button.button-delete`)
        .addEventListener("click", () => deleteLink(option.id));
      document
        .querySelector(`[id = '${option.id}'] td button.button-reorder-up`)
        .addEventListener("click", () => reorderLinkPattern(option.id, -1));
      document
        .querySelector(`[id = '${option.id}'] td button.button-reorder-down`)
        .addEventListener("click", () => reorderLinkPattern(option.id, 1));
    });
    // Every render is also an exit from edit mode (Save, Cancel, Delete,
    // Reorder, Add, Import all flow through here), so this is the natural
    // place to clear the external lockout.
    setEditLockState(false);
  });
}

// Set the error message for the link patterns input. If err is empty, hide the error message.
function setLinkPatternError(err) {
  document.getElementById("link-patterns-error").textContent = err;
  if (err != "" && err != undefined) {
    document.getElementById("link-patterns-error").classList.remove("hidden");
    return;
  }
  document.getElementById("link-patterns-error").classList.add("hidden");
}

// Lock or unlock every storage-mutating control that lives outside the
// editing row, plus Export (so an unsaved draft can't lead to an export
// that doesn't reflect what's on screen). Other rows' Edit/Delete/Reorder
// buttons are locked separately inside editLinkPatternInline (they don't
// exist outside an active table render).
//
// Every exit from edit mode (Save, Cancel, Delete, Reorder, Add, Import)
// re-renders the rules table via loadLinkPatterns(), which calls this with
// `false` at the end of render — so the unlock is automatic.
function setEditLockState(locked) {
  const externalSelectors = [
    "#link-patterns-import",
    "#link-patterns-export",
    "#button-save-link-patterns",
    ".button-import-example",
  ];
  const tooltip = "Finish or cancel the current edit first.";
  externalSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((btn) => {
      if (locked) {
        btn.setAttribute("disabled", "true");
        btn.setAttribute("aria-disabled", "true");
        // Stash any pre-existing title so unlock can restore it. Without
        // this, buttons that ship with a baseline title (e.g. the example
        // Import buttons) would lose their tooltip after the first
        // lock/unlock cycle.
        if (btn.hasAttribute("title") && !btn.dataset.titleBeforeLock) {
          btn.dataset.titleBeforeLock = btn.getAttribute("title");
        }
        btn.setAttribute("title", tooltip);
      } else {
        btn.removeAttribute("disabled");
        btn.removeAttribute("aria-disabled");
        if (btn.dataset.titleBeforeLock) {
          btn.setAttribute("title", btn.dataset.titleBeforeLock);
          delete btn.dataset.titleBeforeLock;
        } else {
          btn.removeAttribute("title");
        }
      }
    });
  });
}

// Set the status message for the Import/Export section. Mirrors
// setLinkPatternError but targets the io-status region so import errors and
// the imported/skipped summary surface next to the Import/Export controls
// instead of in the Add Pattern error box.
function setIoStatus(msg) {
  const el = document.getElementById("link-patterns-io-status");
  el.textContent = msg;
  if (msg != "" && msg != undefined) {
    el.classList.remove("hidden");
    return;
  }
  el.classList.add("hidden");
}

// Set the inline-edit error message for a specific row. The error region
// lives inside td.cell--pattern so it sits directly under the pattern input
// and inherits the editing-row highlight. Empty msg hides the region.
//
// Earlier the inline editor reused setLinkPatternError, which wrote into
// the Add Pattern section's error box — visually disconnected from the row
// being edited. (Flagged by an earlier rubber-duck pass on the options
// redesign as "errors render in Add form's alert region (visually
// disconnected)".)
function setRowEditError(tr, msg) {
  if (!tr) return;
  const el = tr.querySelector(".row-edit-error");
  if (!el) return;
  el.textContent = msg || "";
  if (msg) {
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
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
    } catch {
      setLinkPatternError(
        "Invalid RegEx pattern! - Great work! That's difficult to do! :D"
      );
      console.error("Invalid RegEx");
      return;
    }
    // Snapshot the pre-add array for single-step undo. Captured BEFORE
    // the push below so undo restores exactly what the user had.
    const priorOptions = structuredClone(data.options);
    const newTitle = document.getElementById("title").value;
    // Add new link pattern to data.
    data.options.push({
      id: crypto.randomUUID(),
      title: newTitle,
      pattern: document.getElementById("pattern").value,
      showParent: document.getElementById("show-parent").checked,
      summaryType: document.getElementById("summary-type").value,
      showDate: document.getElementById("show-date").checked,
    });
    // Save new link pattern to disk.
    browser.storage.sync.set({ options: data.options }).then(() => {
      setRulesLastMutation("add", newTitle, priorOptions);
      // Load the new patterns table.
      loadLinkPatterns();
      // Reset input fields.
      document.getElementById("title").value = "";
      document.getElementById("pattern").value = "";
      document.getElementById("pattern").dispatchEvent(new Event("input"));
      document.getElementById("show-parent").checked = false;
      document.getElementById("summary-type").value = "none";
      document.getElementById("show-date").checked = false;
    });
  });
}

// Reorder link patterns in the link patterns table.
// id = ID of the link pattern to move.
// move = Number of positions to move the link pattern. Negative numbers move up, positive numbers move down.
function reorderLinkPattern(id, move) {
  browser.storage.sync.get("options").then((data) => {
    if (data.options.length <= 0) {
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
        let option2Move = data.options.splice(
          data.options.indexOf(option),
          1
        )[0];
        data.options.splice(pOptionIndex, 0, option2Move);
      }
    });

    browser.storage.sync.set({ options: data.options }).then(() => {
      clearRulesLastMutation();
      loadLinkPatterns();
    });
  });
}

// Delete a link pattern from the link patterns table.
function deleteLink(id) {
  browser.storage.sync.get("options").then((data) => {
    if (data.options.length <= 0) {
      //Shouldn't happen?
      return;
    }
    // Capture the pre-mutation state for single-step undo. structuredClone
    // is safe here — pattern entries are plain {string, boolean} objects.
    const priorOptions = structuredClone(data.options);
    let deletedTitle = "";
    data.options.forEach((option) => {
      if (option.id == id) {
        deletedTitle = option.title;
        data.options.splice(data.options.indexOf(option), 1);
      }
    });
    browser.storage.sync.set({ options: data.options }).then(() => {
      setRulesLastMutation("delete", deletedTitle, priorOptions);
      loadLinkPatterns();
    });
  });
}

// Switch a single rules-table row into inline-edit mode. Title and pattern
// become text inputs; the disabled context/date checkboxes become live; the
// summary cell's text becomes a <select>; the Edit button (✏️) becomes a
// Save button (✓), and the Delete button (🗑️) becomes a Cancel button (✗).
//
// While editing, every storage-mutating control is locked out: other rows'
// Edit/Delete/Reorder buttons, plus Import, example Imports, and Add
// Pattern's Save (handled by setEditLockState). All exit paths re-render
// the table via loadLinkPatterns(), which clears the locks. No popups; no
// silent draft loss.
function editLinkPatternInline(id) {
  // Defensive guard. The lockout makes this path mostly unreachable, but
  // keyboard / screen-reader users could still trigger it during the
  // microtask gap between disabling buttons and the next render.
  const otherEditing = document.querySelector(
    "#table-link-patterns tr.editing"
  );
  if (otherEditing && otherEditing.id !== id) return;

  browser.storage.sync.get("options").then((data) => {
    const option = (data.options || []).find((o) => o.id === id);
    if (!option) return;

    const tr = document.getElementById(id);
    if (!tr) return;

    tr.classList.add("editing");

    // Lock every other row's Edit/Delete/Reorder buttons. The current row's
    // Edit button is morphed into ✓ Save and Delete into ✗ Cancel below; its
    // own Reorder buttons stay enabled to match prior behavior.
    const lockTooltip = "Finish or cancel the current edit first.";
    document
      .querySelectorAll("#table-link-patterns tbody tr")
      .forEach((row) => {
        if (row.id === id) return;
        row
          .querySelectorAll(
            ".button-edit, .button-delete, .button-reorder-up, .button-reorder-down"
          )
          .forEach((btn) => {
            btn.setAttribute("disabled", "true");
            btn.setAttribute("aria-disabled", "true");
            btn.setAttribute("title", lockTooltip);
          });
      });
    setEditLockState(true);

    // Title cell — replace the <strong> with a text input.
    const tdTitle = tr.querySelector(".cell--title");
    tdTitle.innerHTML = "";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = option.title;
    titleInput.className = "row-edit-title";
    titleInput.setAttribute("aria-label", "Title");
    tdTitle.appendChild(titleInput);

    // Pattern cell — replace the <pre> with a mono text input. Input and
    // a row-local error region live inside a vertical flex stack so the
    // input visibly slides up when the error appears, without changing
    // the cell's overall height (other rows / sections don't reflow).
    const tdPattern = tr.querySelector(".cell--pattern");
    tdPattern.innerHTML = "";
    const patternStack = document.createElement("div");
    patternStack.className = "row-edit-pattern-stack";
    const patternInput = document.createElement("input");
    patternInput.type = "text";
    patternInput.value = option.pattern;
    patternInput.className = "row-edit-pattern mono";
    patternInput.setAttribute("aria-label", "Pattern");
    patternInput.setAttribute("spellcheck", "false");
    patternStack.appendChild(patternInput);

    const rowError = document.createElement("div");
    rowError.className = "row-edit-error alert hidden";
    rowError.setAttribute("role", "status");
    rowError.setAttribute("aria-live", "polite");
    patternStack.appendChild(rowError);

    tdPattern.appendChild(patternStack);

    // Live regex validation on the pattern input itself: same 300ms
    // debounce as the Add form. Errors render in the row-local region.
    let timer = null;
    patternInput.addEventListener("input", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const v = patternInput.value;
        if (v === "") {
          setRowEditError(tr, "");
          return;
        }
        try {
          new RegExp(v);
          setRowEditError(tr, "");
        } catch (e) {
          setRowEditError(tr, `Invalid regex: ${e.message}`);
        }
      }, 300);
    });

    // Context checkbox — un-disable so the user can toggle.
    tr.querySelector(".cell--context input[type='checkbox']").disabled = false;

    // Summary cell — replace text with a <select>.
    const tdSummary = tr.querySelector(".cell--summary");
    tdSummary.innerHTML = "";
    const summarySelect = document.createElement("select");
    summarySelect.className = "row-edit-summary-type";
    summarySelect.setAttribute("aria-label", "Summary type");
    [
      ["none", "None"],
      ["latest", "Latest"],
      ["all", "All"],
    ].forEach(([value, label]) => {
      const opt = new Option(label, value);
      if (value === (option.summaryType || "none")) opt.selected = true;
      summarySelect.add(opt);
    });
    tdSummary.appendChild(summarySelect);

    // Date checkbox — un-disable.
    tr.querySelector(".cell--date input[type='checkbox']").disabled = false;

    // Edit button → Save (✓). cloneNode is the simplest way to drop the
    // existing click handler without tracking it.
    const editButton = tr.querySelector("button.button-edit");
    const saveButton = editButton.cloneNode(false);
    saveButton.textContent = "✓";
    saveButton.className = "button-edit button-save";
    saveButton.setAttribute("title", "Save changes");
    saveButton.setAttribute("aria-label", `Save ${option.title}`);
    editButton.parentNode.replaceChild(saveButton, editButton);
    saveButton.addEventListener("click", () => saveLinkPatternInline(id));

    // Delete button → Cancel (✗). Cancelling = re-render the table from
    // storage; the original row reappears unchanged.
    const deleteButton = tr.querySelector("button.button-delete");
    const cancelButton = deleteButton.cloneNode(false);
    cancelButton.textContent = "✗";
    cancelButton.className = "button-delete button-cancel";
    cancelButton.setAttribute("title", "Cancel edit");
    cancelButton.setAttribute("aria-label", `Cancel editing ${option.title}`);
    deleteButton.parentNode.replaceChild(cancelButton, deleteButton);
    cancelButton.addEventListener("click", () => {
      // Re-render drops the row-local error region naturally.
      loadLinkPatterns();
    });

    // Keyboard ergonomics: Enter on either text input commits, Escape on
    // either cancels. Bound per-row; the next render replaces the inputs.
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveLinkPatternInline(id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        loadLinkPatterns();
      }
    };
    titleInput.addEventListener("keydown", onKey);
    patternInput.addEventListener("keydown", onKey);

    titleInput.focus();
  });
}

// Persist the inline-edited row back to storage and re-render the table.
function saveLinkPatternInline(id) {
  const tr = document.getElementById(id);
  if (!tr) return;

  const newTitle = tr.querySelector(".row-edit-title").value.trim();
  const newPattern = tr.querySelector(".row-edit-pattern").value;
  const newShowParent = tr.querySelector(
    ".cell--context input[type='checkbox']"
  ).checked;
  const newSummaryType = tr.querySelector(".row-edit-summary-type").value;
  const newShowDate = tr.querySelector(
    ".cell--date input[type='checkbox']"
  ).checked;

  if (!newTitle || !newPattern) {
    setRowEditError(tr, "Title and pattern are required.");
    return;
  }
  try {
    new RegExp(newPattern);
  } catch (e) {
    setRowEditError(tr, `Invalid regex: ${e.message}`);
    return;
  }

  browser.storage.sync.get("options").then((data) => {
    const idx = data.options.findIndex((o) => o.id === id);
    if (idx === -1) return;
    // Capture pre-edit state for single-step undo. The snapshot must be
    // taken before we mutate data.options. We also remember the pre-edit
    // title so the undo label names the rule the user actually changed
    // (renames otherwise look confusing — "Undo edit of <new name>").
    const priorOptions = structuredClone(data.options);
    const priorTitle = data.options[idx].title;
    data.options[idx] = {
      ...data.options[idx],
      title: newTitle,
      pattern: newPattern,
      showParent: newShowParent,
      summaryType: newSummaryType,
      showDate: newShowDate,
    };
    // loadLinkPatterns re-renders the table and drops the row-local error
    // region naturally — no explicit clear needed.
    browser.storage.sync.set({ options: data.options }).then(() => {
      setRulesLastMutation("edit", priorTitle, priorOptions);
      loadLinkPatterns();
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

// Import link patterns from JSON. Performs three layers of validation
// before writing to storage so a malformed file can't replace good data:
//   1. A file is actually selected.
//   2. The file content parses as JSON and is an array.
//   3. Each entry has the required fields and a compilable RegEx pattern.
// Entries that fail the per-entry checks are dropped, not saved. The user
// sees a summary in the inline error region (which doubles as a status
// region for "imported N, skipped M").
function importLinkPatternsJSON() {
  const inputElement = document.getElementById("link-patterns-import-file");
  const file = inputElement.files && inputElement.files[0];
  if (!file) {
    setIoStatus("Choose a JSON file to import first.");
    return;
  }

  // Clear input so picking the same file again re-fires the change event.
  inputElement.value = "";

  const fileReader = new FileReader();
  fileReader.readAsText(file, "UTF-8");
  fileReader.onload = function () {
    let parsed;
    try {
      parsed = JSON.parse(fileReader.result);
    } catch (e) {
      setIoStatus(`Import failed: file is not valid JSON (${e.message}).`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setIoStatus("Import failed: expected a JSON array of patterns.");
      return;
    }

    const overwrite =
      document.querySelector('input[name="link-patterns-import-type"]:checked')
        .value === "overwrite";

    // Filter — drop entries that don't have the required fields or that
    // contain an uncompilable regex. Build a fresh, normalized list.
    const validOptions = [];
    let skipped = 0;
    parsed.forEach((option) => {
      if (
        !option ||
        option.title == undefined ||
        option.pattern == undefined ||
        option.showParent == undefined
      ) {
        skipped += 1;
        return;
      }
      try {
        new RegExp(option.pattern);
      } catch {
        skipped += 1;
        return;
      }
      validOptions.push({
        // Always assign a fresh ID to avoid colliding with existing rules.
        id: crypto.randomUUID(),
        title: option.title,
        pattern: option.pattern,
        showParent: option.showParent,
        summaryType: option.summaryType || "all",
        showDate: option.showDate || false,
      });
    });

    if (validOptions.length === 0) {
      setIoStatus(
        `Import failed: no valid patterns found (skipped ${skipped}).`
      );
      return;
    }

    const reportResult = (priorOptions, mode) => {
      // Capture the pre-import array as a single-step undo snapshot.
      // Both overwrite and append funnel through here, so one path
      // covers both modes.
      setRulesLastMutation("import", mode, priorOptions);
      setIoStatus(
        skipped === 0
          ? ""
          : `Imported ${validOptions.length} pattern${validOptions.length === 1 ? "" : "s"}; skipped ${skipped} invalid.`
      );
      loadLinkPatterns();
    };

    // Always read existing options first so we have a snapshot for undo,
    // regardless of import mode.
    browser.storage.sync.get("options").then((data) => {
      const existing = Array.isArray(data.options) ? data.options : [];
      const priorOptions = structuredClone(existing);
      const next = overwrite ? validOptions : existing.concat(validOptions);
      browser.storage.sync
        .set({ options: next })
        .then(() => reportResult(priorOptions, overwrite ? "overwrite" : "append"));
    });
  };

  fileReader.onerror = function () {
    setIoStatus("Import failed: unable to read file.");
  };
}

// Save the global extension options from user inputs.
function saveGlobalOptions() {
  browser.storage.sync.get("optionsGlobal").then((data) => {
    if (data.optionsGlobal == undefined) {
      data.optionsGlobal = {
        wrapLists: false,
        includeAttachments: false,
        includeImages: false,
      };
    }

    data.optionsGlobal.wrapLists =
      document.getElementById("wrap-lists").checked;
    data.optionsGlobal.backgroundProcessing =
      document.getElementById("background-processing").checked;
    data.optionsGlobal.includeAttachments = document.getElementById(
      "include-attachments"
    ).checked;
    data.optionsGlobal.includeImages =
      document.getElementById("include-images").checked;

    browser.storage.sync.set({
      optionsGlobal: data.optionsGlobal,
    });
  });
}

// Load the global extension options into the list of global options.
function loadGlobalOptions() {
  browser.storage.sync.get("optionsGlobal").then((data) => {
    if (data.optionsGlobal == undefined) {
      data.optionsGlobal = {
        wrapLists: false,
        includeAttachments: false,
        includeImages: false,
      };
    }
    document.getElementById("wrap-lists").checked =
      data.optionsGlobal.wrapLists;
    document.getElementById("background-processing").checked =
      data.optionsGlobal.backgroundProcessing || false;
    document.getElementById("include-attachments").checked =
      data.optionsGlobal.includeAttachments;
    document.getElementById("include-images").checked =
      data.optionsGlobal.includeImages;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners to static elements.
  // Global options event listeners.
  document
    .getElementById("button-save-global-options")
    .addEventListener("click", saveGlobalOptions);
  loadGlobalOptions();

  // Link patterns event listeners. The Add Pattern controls live inside a
  // real <form>, so submit fires on Enter in any field as well as on the
  // Save button click. preventDefault keeps us on the page.
  document
    .getElementById("input-container-link-patterns")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      saveLinkPatterns();
    });
  document
    .getElementById("link-patterns-import")
    .addEventListener("click", importLinkPatternsJSON);
  document
    .getElementById("link-patterns-export")
    .addEventListener("click", downloadLinkPatternsJSON);

  // Wire the rules-undo button. Hidden by default; renderRulesUndoRegion
  // toggles visibility based on rulesLastMutation state.
  document
    .getElementById("rules-undo-btn")
    .addEventListener("click", undoLastRulesMutation);

  // Live regex validation: debounced so we don't recompile on every key.
  // After 300 ms of idle typing we (a) show/clear the inline error and
  // (b) toggle a red "invalid" style on the Save button — a quick visual
  // signal that clicking it won't succeed. Empty input is silent so we
  // don't nag before they've started typing.
  const patternInput = document.getElementById("pattern");
  const saveButton = document.getElementById("button-save-link-patterns");
  let validationTimer = null;
  const VALIDATION_DEBOUNCE_MS = 300;
  const runPatternValidation = () => {
    const value = patternInput.value;
    if (value === "") {
      setLinkPatternError("");
      saveButton.classList.remove("btn--invalid");
      return;
    }
    try {
      new RegExp(value);
      setLinkPatternError("");
      saveButton.classList.remove("btn--invalid");
    } catch (e) {
      setLinkPatternError(`Invalid regex: ${e.message}`);
      saveButton.classList.add("btn--invalid");
    }
  };
  patternInput.addEventListener("input", () => {
    if (validationTimer) clearTimeout(validationTimer);
    validationTimer = setTimeout(runPatternValidation, VALIDATION_DEBOUNCE_MS);
  });

  loadLinkPatterns();

  // One-click import for the example-pattern rows. The Title and Pattern
  // come from the row's text; the three settings come from the row's live
  // form controls so the user can tweak the example before importing it.
  document.querySelectorAll(".button-import-example").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".example-row");
      if (!row) return;
      const title = row.cells[0].textContent.trim();
      const pattern = row.querySelector(".cell--pattern code").textContent;
      const newOption = {
        id: crypto.randomUUID(),
        title: title,
        pattern: pattern,
        showParent: row.querySelector(".example-show-parent").checked,
        summaryType: row.querySelector(".example-summary-type").value,
        showDate: row.querySelector(".example-show-date").checked,
      };
      browser.storage.sync.get("options").then((data) => {
        if (data.options == undefined || data.options.length <= 0) {
          data.options = [];
        }
        // Snapshot pre-add array for single-step undo (see options.js
        // top-of-file rulesLastMutation comment).
        const priorOptions = structuredClone(data.options);
        data.options.push(newOption);
        browser.storage.sync.set({ options: data.options }).then(() => {
          setRulesLastMutation("add", title, priorOptions);
          loadLinkPatterns();
        });
      });
    });
  });
});
