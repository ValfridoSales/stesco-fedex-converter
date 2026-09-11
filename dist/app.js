(function () {
  "use strict";
  const C = window.FedExConverter;
  const STORAGE_KEY = "stesco-fedex-converter-settings-v1";
  let settings = loadSettings();
  let shipments = [];
  let currentFile = null;
  let editingIndex = -1;
  let toastTimer = null;

  const $ = selector => document.querySelector(selector);
  const dropZone = $("#drop-zone");
  const fileInput = $("#file-input");
  const results = $("#results");
  const settingsDialog = $("#settings-dialog");
  const rowDialog = $("#row-dialog");

  const senderFieldConfig = [
    ["senderContactName", "Contact name"], ["senderCompany", "Company"],
    ["senderContactNumber", "Phone"], ["senderEmail", "Email", "email"],
    ["senderLine1", "Address line 1", "text", true], ["senderLine2", "Address line 2"],
    ["senderCity", "City"], ["senderProvince", "Province"],
    ["senderPostcode", "Postal code"], ["senderCountry", "Country code"]
  ];
  const sharedFieldConfig = [
    ["recipientContactNumber", "Recipient phone"], ["recipientEmail", "Recipient email", "email"],
    ["packageType", "Package type"], ["weightUnits", "Weight units"],
    ["serviceType", "Service type"], ["currencyType", "Default currency"]
  ];
  const recipientFieldConfig = [
    ["poNumber", "Customer PO"], ["reference", "Reference"],
    ["recipientContactName", "Attention name", "text", true], ["recipientCompany", "Recipient company", "text", true],
    ["recipientContactNumber", "Recipient phone"], ["recipientEmail", "Recipient email", "email"],
    ["recipientLine1", "Address line 1", "text", true], ["recipientLine2", "Address line 2"],
    ["recipientLine3", "Address line 3"], ["recipientCity", "City"],
    ["recipientProvince", "Province"], ["recipientPostcode", "Postal code"], ["recipientCountry", "Country code"]
  ];
  const packageFieldConfig = [
    ["packageType", "Package type"], ["numberOfPackages", "Number of packages", "number"],
    ["packageWeight", "Weight per package", "number"], ["weightUnits", "Weight units"],
    ["length", "Length (in)", "number"], ["width", "Width (in)", "number"],
    ["height", "Height (in)", "number"], ["currencyType", "Currency"], ["serviceType", "Service type"]
  ];

  function loadSettings() {
    try { return { ...C.DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return { ...C.DEFAULT_SETTINGS }; }
  }

  function fieldMarkup([key, label, type = "text", wide = false], values, prefix) {
    const id = `${prefix}-${key}`;
    return `<div class="field${wide ? " field-wide" : ""}">
      <label for="${id}">${escapeHtml(label)}</label>
      <input id="${id}" name="${key}" type="${type}" value="${escapeHtml(values[key] ?? "")}" ${type === "number" ? 'min="0" step="any" inputmode="decimal"' : ""} />
    </div>`;
  }

  function populateFields(container, config, values, prefix) {
    container.innerHTML = config.map(item => fieldMarkup(item, values, prefix)).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { showToast("Choose a CSV file exported from Flute."); return; }
    try {
      const text = await file.text();
      stageCsv(text, file.name, file.size, file);
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showToast(error.message || "The CSV could not be processed.");
      fileInput.value = "";
    }
  }

  function stageCsv(text, fileName, fileSize, fileReference = null) {
    shipments = C.convertCsv(text, settings);
    currentFile = fileReference;
    dropZone.classList.add("has-file");
    results.hidden = false;
    $("#file-name").textContent = fileName || "Flute export.csv";
    $("#file-meta").textContent = `${shipments.length} shipment ${shipments.length === 1 ? "line" : "lines"}${Number.isFinite(fileSize) ? ` · ${formatBytes(fileSize)}` : ""}`;
    render();
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function render() {
    shipments.forEach(shipment => {
      shipment.errors = C.validateFedExRow(shipment.fedex);
      shipment.status = shipment.errors.length ? "review" : "ready";
    });
    const ready = shipments.filter(item => item.status === "ready").length;
    const review = shipments.length - ready;
    $("#metric-total").textContent = shipments.length;
    $("#metric-ready").textContent = ready;
    $("#metric-review").textContent = review;
    $("#download").disabled = shipments.length === 0 || review > 0;
    const banner = $("#validation-banner");
    banner.dataset.state = review ? "review" : "ready";
    $("#validation-title").textContent = review ? `${review} ${review === 1 ? "row needs" : "rows need"} review` : "Ready to export";
    $("#validation-copy").textContent = review ? "Open the highlighted rows and complete the missing shipment details." : "All required FedEx fields are complete.";
    $("#shipment-rows").innerHTML = shipments.map((shipment, index) => rowMarkup(shipment, index)).join("");
  }

  function rowMarkup(shipment, index) {
    const r = shipment.fedex;
    const statusText = shipment.status === "ready" ? "Ready" : "Review";
    const sourceDetail = [shipment.sourceOrder && `Flute ${shipment.sourceOrder}`, shipment.sourceLine && `line ${shipment.sourceLine}`].filter(Boolean).join(" · ");
    return `<tr>
      <td><span class="status-pill ${shipment.status === "review" ? "review" : ""}">${statusText}</span></td>
      <td><div class="stacked-cell"><span class="cell-primary">${escapeHtml(r.poNumber || "Missing")}</span><span class="cell-secondary">${escapeHtml(sourceDetail)}</span></div></td>
      <td><div class="stacked-cell"><span class="cell-primary">${escapeHtml(r.reference || "Unmapped")}</span><span class="cell-secondary">${escapeHtml(shipment.productKey || shipment.docketId || "No product code")}</span></div></td>
      <td>${escapeHtml(r.recipientContactName || "Missing")}</td>
      <td>${escapeHtml(r.recipientCompany || "Missing")}</td>
      <td><div class="stacked-cell"><span class="cell-primary">${escapeHtml(r.recipientCity || "Missing")}, ${escapeHtml(r.recipientProvince)}</span><span class="cell-secondary">${escapeHtml(r.recipientPostcode)}</span></div></td>
      <td class="numeric">${escapeHtml(r.numberOfPackages)}</td>
      <td>${escapeHtml(r.packageWeight)} ${escapeHtml(r.weightUnits)}</td>
      <td>${escapeHtml(r.length)} × ${escapeHtml(r.width)} × ${escapeHtml(r.height)} in</td>
      <td><button class="edit-button" type="button" data-edit-row="${index}" aria-label="Review shipment row ${index + 1}">Review</button></td>
    </tr>`;
  }

  function openSettings() {
    populateFields($("#sender-fields"), senderFieldConfig, settings, "setting");
    populateFields($("#shared-fields"), sharedFieldConfig, settings, "setting");
    settingsDialog.showModal();
  }

  function saveSettings(event) {
    if (event.submitter?.value !== "default") return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    settings = { ...settings, ...Object.fromEntries(data.entries()) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (shipments.length && currentFile) {
      currentFile.text().then(text => {
        shipments = C.convertCsv(text, settings);
        render();
      }).catch(() => showToast("Defaults were saved, but the current file could not be refreshed."));
    }
    settingsDialog.close();
    showToast("Shipment defaults saved on this device.");
  }

  function openRow(index) {
    editingIndex = index;
    const shipment = shipments[index];
    $("#row-dialog-eyebrow").textContent = `Source row ${shipment.sourceRow}${shipment.docketId ? ` · docket ${shipment.docketId}` : ""}`;
    $("#row-dialog-title").textContent = shipment.fedex.reference || "Review shipment";
    populateFields($("#row-recipient-fields"), recipientFieldConfig, shipment.fedex, "row");
    populateFields($("#row-package-fields"), packageFieldConfig, shipment.fedex, "row");
    renderDialogErrors(shipment.errors);
    highlightInvalidFields(shipment.errors);
    rowDialog.showModal();
    requestAnimationFrame(() => rowDialog.querySelector('[aria-invalid="true"]')?.focus());
  }

  function renderDialogErrors(errors) {
    const area = $("#row-errors");
    area.hidden = !errors.length;
    area.innerHTML = errors.length ? `<strong>Complete these fields:</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : "";
  }

  function clearInvalidFields() {
    rowDialog.querySelectorAll('[aria-invalid="true"]').forEach(input => {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      input.closest(".field")?.classList.remove("has-error");
    });
    rowDialog.querySelectorAll(".field-error").forEach(message => message.remove());
  }

  function highlightInvalidFields(errors) {
    clearInvalidFields();
    errors.forEach(error => {
      const fieldName = error.match(/^([A-Za-z][A-Za-z0-9]*)\b/)?.[1];
      if (!fieldName) return;
      const input = rowDialog.querySelector(`[name="${CSS.escape(fieldName)}"]`);
      if (!input) return;
      const field = input.closest(".field");
      const message = document.createElement("small");
      const messageId = `${input.id}-error`;
      const detail = error.slice(fieldName.length).trim();
      message.id = messageId;
      message.className = "field-error";
      message.textContent = detail ? `This field ${detail}` : "Review this field.";
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", messageId);
      field?.classList.add("has-error");
      field?.appendChild(message);
    });
  }

  function saveRow(event) {
    if (event.submitter?.value !== "default") return;
    event.preventDefault();
    const shipment = shipments[editingIndex];
    Object.assign(shipment.fedex, Object.fromEntries(new FormData(event.currentTarget).entries()));
    shipment.fedex.senderPostcode = C.normalizePostcode(shipment.fedex.senderPostcode);
    shipment.fedex.recipientPostcode = C.normalizePostcode(shipment.fedex.recipientPostcode);
    shipment.errors = C.validateFedExRow(shipment.fedex);
    shipment.status = shipment.errors.length ? "review" : "ready";
    if (shipment.errors.length) {
      renderDialogErrors(shipment.errors);
      highlightInvalidFields(shipment.errors);
      rowDialog.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    rowDialog.close();
    render();
    showToast("Shipment row updated.");
  }

  function downloadCsv() {
    if (shipments.some(item => item.status !== "ready")) return;
    const csv = C.exportFedExCsv(shipments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const uniquePo = [...new Set(shipments.map(item => item.fedex.poNumber).filter(Boolean))];
    const suffix = uniquePo.length === 1 ? uniquePo[0] : new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `FedEx_Batch_${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`FedEx CSV created with ${shipments.length} shipment lines.`);
  }

  function clearFile() {
    shipments = [];
    currentFile = null;
    fileInput.value = "";
    results.hidden = true;
    dropZone.classList.remove("has-file", "is-dragging");
    dropZone.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const editableFields = [...new Set([...recipientFieldConfig, ...packageFieldConfig].map(item => item[0]))];
    const safeRegister = tool => {
      try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); }
      catch { /* Optional browser capability. The visible interface remains primary. */ }
    };
    safeRegister({
      name: "stage_flute_csv",
      title: "Stage Flute CSV",
      description: "Parse Flute CSV text, convert every order line, and show the resulting shipment review in the app.",
      inputSchema: {
        type: "object",
        properties: {
          csvText: { type: "string", description: "Complete Flute CSV content, including the header row." },
          fileName: { type: "string", description: "Display name for the staged CSV." }
        },
        required: ["csvText"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        if (!input || typeof input.csvText !== "string") throw new Error("csvText must be a string.");
        stageCsv(input.csvText, typeof input.fileName === "string" ? input.fileName : "Flute export.csv", undefined, null);
        const ready = shipments.filter(item => item.status === "ready").length;
        return { shipmentLines: shipments.length, ready, needsReview: shipments.length - ready };
      }
    });
    safeRegister({
      name: "update_shipment_row",
      title: "Update shipment row",
      description: "Update editable FedEx fields on one staged shipment row and refresh its validation status.",
      inputSchema: {
        type: "object",
        properties: {
          rowNumber: { type: "integer", minimum: 1, description: "One-based shipment row number." },
          changes: {
            type: "object",
            properties: Object.fromEntries(editableFields.map(field => [field, { type: ["string", "number"] }])),
            additionalProperties: false
          }
        },
        required: ["rowNumber", "changes"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        if (!input || !Number.isInteger(input.rowNumber) || input.rowNumber < 1 || input.rowNumber > shipments.length) throw new Error("rowNumber is outside the staged shipment range.");
        if (!input.changes || typeof input.changes !== "object" || Array.isArray(input.changes)) throw new Error("changes must be an object.");
        const invalid = Object.keys(input.changes).filter(field => !editableFields.includes(field));
        if (invalid.length) throw new Error(`Fields cannot be edited: ${invalid.join(", ")}.`);
        Object.assign(shipments[input.rowNumber - 1].fedex, input.changes);
        render();
        const shipment = shipments[input.rowNumber - 1];
        return { rowNumber: input.rowNumber, status: shipment.status, errors: shipment.errors };
      }
    });
    safeRegister({
      name: "export_fedex_csv",
      title: "Export FedEx CSV",
      description: "Return the exact 70-column FedEx CSV after all staged shipment rows pass validation.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() {
        if (!shipments.length) throw new Error("No Flute CSV is staged.");
        const needsReview = shipments.filter(item => item.status !== "ready").length;
        if (needsReview) throw new Error(`${needsReview} shipment rows still need review.`);
        return { shipmentLines: shipments.length, csvText: C.exportFedExCsv(shipments) };
      }
    });
  }

  $("#choose-file").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", event => handleFile(event.target.files[0]));
  dropZone.addEventListener("click", event => { if (!event.target.closest("button")) fileInput.click(); });
  dropZone.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") fileInput.click(); });
  ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove("is-dragging"); }));
  dropZone.addEventListener("drop", event => handleFile(event.dataTransfer.files[0]));
  dropZone.tabIndex = 0;
  $("#clear-file").addEventListener("click", clearFile);
  $("#download").addEventListener("click", downloadCsv);
  $("#open-settings").addEventListener("click", openSettings);
  $("#settings-form").addEventListener("submit", saveSettings);
  $("#row-form").addEventListener("submit", saveRow);
  $("#row-form").addEventListener("input", event => {
    if (!event.target.closest("input, select") || editingIndex < 0) return;
    const draft = {
      ...shipments[editingIndex].fedex,
      ...Object.fromEntries(new FormData(event.currentTarget).entries())
    };
    const errors = C.validateFedExRow(draft);
    renderDialogErrors(errors);
    highlightInvalidFields(errors);
  });
  $("#shipment-rows").addEventListener("click", event => {
    const button = event.target.closest("[data-edit-row]");
    if (button) openRow(Number(button.dataset.editRow));
  });
  registerWebMcpTools();
})();
