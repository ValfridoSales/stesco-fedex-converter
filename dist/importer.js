(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports ? require("./xlsx.full.min.js") : root.XLSX
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FluteFileImporter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (XLSX) {
  "use strict";

  const SUPPORTED_EXTENSIONS = new Set(["csv", "xls", "xlsx"]);

  function extensionOf(fileName) {
    const match = String(fileName || "").toLowerCase().match(/\.([^.]+)$/);
    return match ? match[1] : "";
  }

  function fileTypeLabel(fileName) {
    const extension = extensionOf(fileName);
    return SUPPORTED_EXTENSIONS.has(extension) ? extension.toUpperCase() : "";
  }

  function workbookToRows(data) {
    if (!XLSX?.read || !XLSX?.utils?.sheet_to_json) {
      throw new Error("The Excel reader could not be loaded. Reopen the app and try again.");
    }
    const isNodeBuffer = typeof Buffer !== "undefined" && Buffer.isBuffer?.(data);
    const input = isNodeBuffer ? data : new Uint8Array(data);
    const workbook = XLSX.read(input, { type: isNodeBuffer ? "buffer" : "array", cellDates: false });
    const firstSheetName = workbook.SheetNames?.[0];
    if (!firstSheetName) throw new Error("The Excel workbook does not contain a worksheet.");
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });
    if (!rows.length) throw new Error("The Excel worksheet is empty.");
    return rows.map(row => row.map(value => value == null ? "" : String(value)));
  }

  async function readFluteFile(file) {
    const type = fileTypeLabel(file?.name);
    if (!type) throw new Error(`${file?.name || "Selected file"}: Choose a Flute XLS, XLSX, or CSV file.`);
    try {
      if (type === "CSV") return { name: file.name, size: file.size, type, text: await file.text() };
      return { name: file.name, size: file.size, type, rows: workbookToRows(await file.arrayBuffer()) };
    } catch (error) {
      if (String(error?.message || "").startsWith(`${file.name}:`)) throw error;
      throw new Error(`${file.name}: Could not read this ${type} file. ${error?.message || ""}`.trim());
    }
  }

  return { SUPPORTED_EXTENSIONS, extensionOf, fileTypeLabel, workbookToRows, readFluteFile };
});
