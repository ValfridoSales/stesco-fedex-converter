(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FedExConverter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FEDEX_HEADERS = [
    "poNumber", "reference", "senderContactName", "senderCompany", "senderContactNumber", "senderEmail",
    "senderLine1", "senderLine2", "senderPostcode", "senderState", "senderCity", "senderCountry",
    "recipientContactName", "recipientCompany", "recipientContactNumber", "recipientEmail", "recipientLine1",
    "recipientLine2", "recipientLine3", "recipientPostcode", "recipientState", "recipientCity",
    "recipientCountry", "packageType", "numberOfPackages", "packageWeight", "weightUnits", "length", "width",
    "height", "currencyType", "oneRatePricing", "commodityType", "itemDescription", "harmonizedCode",
    "manufacturingCountry", "commodityQuantity", "commodityMeasureUnit", "commodityWeight", "customsValue",
    "documentType", "documentDescription", "purposeOfShipment", "generateInvoice", "etdEnabled", "serviceType",
    "soldToPartyCountry", "soldToPartyContactName", "soldToPartyCompany", "soldToPartyLine1", "soldToPartyLine2",
    "soldToPartyLine3", "soldToPartyCity", "soldToPartyState", "soldToPartyPostcode",
    "soldToPartyPhoneExtension", "soldToPartyContactNumber", "soldToPartyTin", "soldToPartyEmail",
    "soldToPartyAccountNumber", "cpscProductId", "cpscProductIdType", "cpscDisclaimCode", "cpscIntendedUseCode",
    "cpscIntendedUseDescription", "cpscProductVersion", "cpscCertifierId", "euDeMinimisMerchantProductId",
    "euDeMinimisNonStandardManufacturerProductId", "euDeMinimisStandardManufacturerProductId"
  ];

  const REQUIRED_FLUTE_HEADERS = [
    "billing_po", "ship_nme", "ship_nme2", "ship_add1", "ship_city", "ship_prov", "ship_posta", "ship_count",
    "order_qty", "docket_id", "docket_txt"
  ];

  const REQUIRED_FEDEX_FIELDS = [
    "poNumber", "reference", "senderContactName", "senderCompany", "senderContactNumber", "senderEmail", "senderLine1",
    "senderPostcode", "senderProvince", "senderCity", "senderCountry", "recipientContactName", "recipientCompany",
    "recipientContactNumber", "recipientEmail", "recipientLine1", "recipientPostcode", "recipientProvince",
    "recipientCity", "recipientCountry", "packageType", "numberOfPackages", "packageWeight", "weightUnits",
    "currencyType", "serviceType"
  ];

  const PRODUCT_MAP = {
    "FOOLOC-059": { docketIds: ["120066"], reference: "Small", length: 18, width: 13, height: 13, weight: 19 },
    "FOOLOC-060": { docketIds: ["120067"], reference: "Small Plus", length: 22, width: 12, height: 15, weight: 22 },
    "FOOLOC-061": { docketIds: ["120073"], reference: "Medium", length: 26, width: 12, height: 16, weight: 33 },
    "FOOLOC-062": { docketIds: ["120074"], reference: "X-Large", length: 31, width: 12, height: 20, weight: 43 },
    "FOOLOC-063": { docketIds: ["120075"], reference: "Multi XXL", length: 29, width: 6, height: 26, weight: 28 },
    "FOOLOC-066": { docketIds: [], reference: "Packing Slip", length: 15, width: 12, height: 4, weight: 15 },
    "FOOLOC-067": { docketIds: ["121897"], reference: "Tape Dispenser", length: 10, width: 8, height: 4, weight: 2 },
    "FOOLOC-072": { docketIds: ["121985"], reference: "MED Mailer", length: 11, width: 13, height: 4, weight: 10 },
    "FOOLOC-073": { docketIds: ["121986"], reference: "LRG Mailer", length: 12, width: 18, height: 3, weight: 9 },
    "FOOLOC-076": { docketIds: ["121938"], reference: "Tape", length: 12, width: 10, height: 14, weight: 19 }
  };

  const DEFAULT_SETTINGS = {
    senderContactName: "Margaret Ha",
    senderCompany: "Stesco",
    senderContactNumber: "6474984500",
    senderEmail: "fedex@stescoglobal.com",
    senderLine1: "100 MARMORA ST",
    senderLine2: "",
    senderPostcode: "M9M2X5",
    senderProvince: "ON",
    senderCity: "NORTH YORK",
    senderCountry: "CA",
    recipientContactNumber: "6474984500",
    recipientEmail: "fedex@stescoglobal.com",
    packageType: "YOUR_PACKAGING",
    weightUnits: "LBS",
    serviceType: "FEDEX_GROUND",
    currencyType: "CAD"
  };

  function clean(value) {
    return value == null ? "" : String(value).trim();
  }

  function parseCsv(text) {
    if (typeof text !== "string") throw new Error("CSV content must be text.");
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 1; }
          else quoted = false;
        } else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field);
        if (row.some(value => value !== "")) rows.push(row);
        row = [];
        field = "";
      } else field += char;
    }
    if (quoted) throw new Error("The CSV contains an unfinished quoted field.");
    row.push(field);
    if (row.some(value => value !== "")) rows.push(row);
    if (!rows.length) throw new Error("The CSV is empty.");
    rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
    return rows;
  }

  function rowsToObjects(rows) {
    const headers = rows[0].map(clean);
    const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
    if (duplicates.length) throw new Error(`The Flute file contains duplicate columns: ${[...new Set(duplicates)].join(", ")}.`);
    const missing = REQUIRED_FLUTE_HEADERS.filter(header => !headers.includes(header));
    if (missing.length) throw new Error(`This does not look like the expected Flute export. Missing columns: ${missing.join(", ")}.`);
    return rows.slice(1).filter(row => row.some(value => clean(value) !== "")).map((row, rowIndex) => {
      const object = { __sourceRow: rowIndex + 2 };
      headers.forEach((header, index) => { if (header) object[header] = row[index] == null ? "" : row[index]; });
      return object;
    });
  }

  function findProduct(source) {
    const codeMatch = clean(source.docket_txt).match(/\[(FOOLOC-\d+)\]/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : "";
    if (code && PRODUCT_MAP[code]) return { key: code, ...PRODUCT_MAP[code] };
    const docketId = clean(source.docket_id).replace(/[^0-9]/g, "");
    const fallback = Object.entries(PRODUCT_MAP).find(([, product]) => product.docketIds.includes(docketId));
    return fallback ? { key: fallback[0], ...fallback[1] } : null;
  }

  function normalizeCountry(value) {
    const normalized = clean(value).toUpperCase().replace(/\./g, "");
    if (["CANADA", "CAN", "CDN", "CA"].includes(normalized)) return "CA";
    if (["UNITED STATES", "UNITED STATES OF AMERICA", "USA", "US"].includes(normalized)) return "US";
    return normalized.length === 2 ? normalized : normalized.slice(0, 2);
  }

  function normalizeCurrency(value, fallback) {
    const normalized = clean(value).toUpperCase();
    if (["CDN", "CAN", "CAD"].includes(normalized)) return "CAD";
    if (["US", "USD"].includes(normalized)) return "USD";
    return normalized || fallback;
  }

  function normalizePostcode(value) {
    return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function normalizeProvince(value, country) {
    const code = clean(value).toUpperCase();
    if (normalizeCountry(country) !== "CA") return code;
    return ({ SA: "SK" })[code] || code;
  }

  // Keep UI and saved settings compatible; FedEx calls province fields "State".
  const EXPORT_FIELD_KEYS = { senderState: "senderProvince", recipientState: "recipientProvince" };

  function emptyFedExRow() {
    return Object.fromEntries(FEDEX_HEADERS.map(header => [EXPORT_FIELD_KEYS[header] || header, ""]));
  }

  function convertRecord(source, settings) {
    const product = findProduct(source);
    const row = emptyFedExRow();
    Object.assign(row, {
      poNumber: clean(source.billing_po),
      reference: product ? product.reference : "",
      senderContactName: clean(settings.senderContactName),
      senderCompany: clean(settings.senderCompany),
      senderContactNumber: clean(settings.senderContactNumber),
      senderEmail: clean(settings.senderEmail),
      senderLine1: clean(settings.senderLine1),
      senderLine2: clean(settings.senderLine2),
      senderPostcode: normalizePostcode(settings.senderPostcode),
      senderProvince: clean(settings.senderProvince).toUpperCase(),
      senderCity: clean(settings.senderCity).toUpperCase(),
      senderCountry: normalizeCountry(settings.senderCountry),
      recipientContactName: clean(source.ship_nme2),
      recipientCompany: clean(source.ship_nme),
      recipientContactNumber: clean(settings.recipientContactNumber),
      recipientEmail: clean(settings.recipientEmail),
      recipientLine1: clean(source.ship_add1),
      recipientLine2: clean(source.ship_add2),
      recipientLine3: "",
      recipientPostcode: normalizePostcode(source.ship_posta),
      recipientProvince: normalizeProvince(source.ship_prov, source.ship_count),
      recipientCity: clean(source.ship_city).toUpperCase(),
      recipientCountry: normalizeCountry(source.ship_count),
      packageType: clean(settings.packageType),
      numberOfPackages: clean(source.order_qty),
      packageWeight: product ? product.weight : "",
      weightUnits: clean(settings.weightUnits),
      length: product ? product.length : "",
      width: product ? product.width : "",
      height: product ? product.height : "",
      currencyType: normalizeCurrency(source.currency_d, clean(settings.currencyType)),
      serviceType: clean(settings.serviceType)
    });
    const result = {
      sourceRow: source.__sourceRow,
      sourceOrder: clean(source.order_id),
      sourceLine: clean(source.order_line),
      docketId: clean(source.docket_id),
      productKey: product ? product.key : "",
      fedex: row,
      warnings: product ? [] : [`No product mapping was found for docket ${clean(source.docket_id) || "(blank)"}.`]
    };
    result.errors = validateFedExRow(row);
    result.status = result.errors.length ? "review" : "ready";
    return result;
  }

  function validateFedExRow(row) {
    const errors = [];
    REQUIRED_FEDEX_FIELDS.forEach(field => {
      if (!clean(row[field])) errors.push(`${field} is required.`);
    });
    const packageCount = Number(row.numberOfPackages);
    if (clean(row.numberOfPackages) && (!Number.isInteger(packageCount) || packageCount <= 0)) errors.push("numberOfPackages must be a whole number greater than zero.");
    const weight = Number(row.packageWeight);
    if (clean(row.packageWeight) && (!(weight > 0))) errors.push("packageWeight must be greater than zero.");
    ["length", "width", "height"].forEach(field => {
      const value = Number(row[field]);
      if (!clean(row[field])) errors.push(`${field} is required for your packaging.`);
      else if (!(value > 0)) errors.push(`${field} must be greater than zero.`);
    });
    if (clean(row.senderEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(row.senderEmail))) errors.push("senderEmail is not valid.");
    if (clean(row.recipientEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(row.recipientEmail))) errors.push("recipientEmail is not valid.");
    return [...new Set(errors)];
  }

  function convertCsv(text, settings) {
    return convertRows(parseCsv(text), settings);
  }

  function convertRows(rows, settings) {
    const sourceRows = rowsToObjects(rows);
    if (!sourceRows.length) throw new Error("The Flute export contains headers but no shipment lines.");
    const effectiveSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    return sourceRows.map(source => convertRecord(source, effectiveSettings));
  }

  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function convertFiles(files, settings) {
    return files.flatMap((file, fileIndex) => {
      try {
        const converted = Array.isArray(file.rows)
          ? convertRows(file.rows, settings)
          : convertCsv(file.text, settings);
        return converted.map(row => ({ ...row, sourceFile: file.name, sourceFileIndex: fileIndex }));
      } catch (error) { throw new Error(`${file.name}: ${error.message}`); }
    });
  }

  function duplicateIndexes(rows) {
    const seen = new Set();
    const duplicates = [];
    rows.forEach((row, index) => {
      if (!row.sourceOrder || !row.sourceLine) return;
      const key = JSON.stringify([row.sourceOrder, row.sourceLine]);
      if (seen.has(key) && !row.duplicateConfirmed) duplicates.push(index);
      seen.add(key);
    });
    return duplicates;
  }

  function exportFedExCsv(shipments) {
    const lines = [FEDEX_HEADERS.map(csvEscape).join(",")];
    shipments.forEach(shipment => {
      lines.push(FEDEX_HEADERS.map(header => {
        const row = shipment.fedex;
        let value = row[EXPORT_FIELD_KEYS[header] || header];
        if (header === "senderState" || header === "recipientState") {
          const country = header === "senderState" ? row.senderCountry : row.recipientCountry;
          if (normalizeCountry(country) === "CA") {
            const code = clean(value).toUpperCase();
            value = ({ SA: "SK", QC: "PQ", NL: "NF" })[code] || code;
          }
        }
        return csvEscape(value);
      }).join(","));
    });
    return `${lines.join("\r\n")}\r\n`;
  }

  return {
    convertFiles,
    duplicateIndexes,
    FEDEX_HEADERS,
    REQUIRED_FLUTE_HEADERS,
    REQUIRED_FEDEX_FIELDS,
    PRODUCT_MAP,
    DEFAULT_SETTINGS,
    parseCsv,
    rowsToObjects,
    findProduct,
    convertCsv,
    convertRows,
    convertRecord,
    validateFedExRow,
    exportFedExCsv,
    normalizeCountry,
    normalizeCurrency,
    normalizePostcode,
    normalizeProvince
  };
});
