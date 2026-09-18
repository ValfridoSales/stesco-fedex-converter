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

  const FLUTE_HEADERS = [
    "order_id", "customer_i", "status_id", "print_stat", "order_dte", "order_user", "modified_d", "modified_u",
    "ship_nbr", "ship_nme", "ship_nme2", "ship_add1", "ship_add2", "ship_city", "ship_prov", "ship_posta",
    "ship_count", "ship_via", "ship_fob", "status_flg", "sales_code", "discount_p", "ship_same", "salesrep_i",
    "charge_tax", "charge_ta2", "charge_ta3", "charge_ta4", "discount", "revision_n", "revision_d", "customer_c",
    "currency_i", "shipping_h", "created_on", "appt_made", "appt_made_", "appt_made2", "appt_dte", "appt_time",
    "order_rece", "orderdet_i", "order_id1", "order_line", "docket_id", "short_name", "scheduled_", "due_dte_ds",
    "requested_", "requested2", "billing_po", "shipping_p", "order_type", "jit_build2", "jit_build3", "jit_build4",
    "jit_build5", "jit_status", "order_qty", "pricing_qt", "order_min", "order_max", "cost_price", "selling_pr",
    "custom_id", "gl_code_id", "schedule_s", "material_s", "corrugator", "corrugato2", "corrugato3", "hot",
    "first_avai", "delivery_s", "order_cate", "jit_build6", "requested3", "material_e", "material_a", "material_o",
    "labour_eac", "overhead_e", "delivery_e", "other_each", "skids_each", "commission", "run_qty", "customer_n",
    "salesrep_n", "gl_code_ds", "sqf", "ship_qty", "unitizing_", "old_code", "skid_type_", "ship_uniti",
    "print_type", "style_dsc", "style_dsc2", "material_d", "short_nam2", "material_2", "closure_ds", "closure_d2",
    "printing_d", "printing_2", "custom_dsc", "custom_pic", "custom_div", "group_by", "category_d", "unitizing2",
    "division_d", "transfer", "prev_shipp", "docket_txt"
  ];

  const FLUTE_CONFIRMATION_HEADERS = [
    "order_id", "customer_i", "status_id", "print_stat", "order_dte", "order_user", "modified_d", "modified_u",
    "ship_nbr", "ship_nme", "ship_nme2", "ship_add1", "ship_add2", "ship_city", "ship_prov", "ship_posta",
    "ship_count", "ship_via", "ship_fob", "status_flg", "sales_code", "discount_p", "ship_same", "salesrep_i",
    "charge_tax", "charge_ta2", "charge_ta3", "charge_ta4", "discount", "revision_n", "revision_d", "customer_c",
    "currency_i", "shipping_h", "created_on", "appt_made", "appt_made_", "appt_made2", "appt_dte", "appt_time",
    "order_rece", "orderdet_i", "order_id1", "order_line", "docket_id", "short_name", "scheduled_", "due_dte_ds",
    "requested_", "requested2", "billing_po", "shipping_p", "order_type", "jit_build_", "jit_build2", "jit_build3",
    "jit_build4", "jit_status", "order_qty", "pricing_qt", "order_min", "order_max", "cost_price", "selling_pr",
    "custom_id", "gl_code_id", "schedule_s", "material_s", "corrugator", "corrugato2", "corrugato3", "hot",
    "first_avai", "delivery_s", "order_cate", "jit_build5", "requested3", "material_e", "material_a", "material_o",
    "labour_eac", "overhead_e", "delivery_e", "other_each", "skids_each", "commission", "run_qty", "customer_n",
    "customer_2", "customer_a", "customer_3", "customer_4", "customer_p", "customer_5", "customer_6", "customer_7",
    "customer_f", "tax1_numbe", "tax2_numbe", "terms_dsc", "style_dsc", "style_dsc2", "material_d", "confirmati",
    "min_per", "max_per", "line_value", "custom_div", "total_valu", "material_2", "closure_ds", "closure_d2",
    "printing_d", "printing_2", "custom_dsc", "custom_pic", "custom_rou", "contact_id", "customer_8", "customer_9",
    "contact_sa", "contact_fi", "contact_la", "contact_ti", "contact_ty", "contact_t2", "contact_t3", "contact_t4",
    "contact_nm", "contact_n2", "contact_ad", "contact_a2", "contact_ci", "contact_pr", "contact_po", "contact_co",
    "contact_ph", "contact_p2", "contact_p3", "contact_fa", "contact_f2", "contact_em", "contact_us", "allow_onli",
    "web_user_i", "web_passwo", "allow_quic", "allow_dock", "contact_ce", "contact_c2", "contact_ho", "contact_h2",
    "default_or", "default_qu", "contact_t5", "allow_orde", "reseller", "advanced_r", "scheduler", "contact_t6",
    "allow_ar", "super_user", "default_wa", "survey_sta", "currency_d", "sign_off", "already_se", "p_jpg",
    "docket_txt"
  ];

  const PAPER_BAGS_HEADERS = [
    "div", "store #", "Banner", "Store Name", "Address", "Store City", "Store State", "Postal code",
    "Delivery Time (Days)", "QTY"
  ];

  // Retained as a public alias for integrations that used the earlier name.
  const REQUIRED_FLUTE_HEADERS = FLUTE_HEADERS;

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

  function sameHeaders(actual, expected) {
    return actual.length === expected.length && actual.every((header, index) => header === expected[index]);
  }

  function layoutError(headers) {
    const schemas = [
      { label: "Flute order_jit_ships", headers: FLUTE_HEADERS },
      { label: "Flute order_confirmation", headers: FLUTE_CONFIRMATION_HEADERS },
      { label: "Paper Bags", headers: PAPER_BAGS_HEADERS }
    ];
    const closest = schemas.map(schema => ({
      ...schema,
      score: schema.headers.filter(header => headers.includes(header)).length
    })).sort((a, b) => b.score - a.score)[0];
    const missing = closest.headers.filter(header => !headers.includes(header));
    const unexpected = headers.filter(header => !closest.headers.includes(header));
    const details = [];
    if (missing.length) details.push(`Missing: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ", …" : ""}.`);
    if (unexpected.length) details.push(`Unexpected: ${unexpected.slice(0, 6).join(", ")}${unexpected.length > 6 ? ", …" : ""}.`);
    if (!missing.length && !unexpected.length) details.push("The column order has changed.");
    return new Error(`The file layout does not match a supported Flute or Paper Bags layout. Closest match: ${closest.label}. ${details.join(" ")} Download is blocked to prevent an incorrect conversion.`);
  }

  function rowsToObjects(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error("The source file is empty.");
    const headerRowIndex = rows.findIndex(row => Array.isArray(row) && row.some(value => clean(value) !== ""));
    if (headerRowIndex < 0) throw new Error("The source file is empty.");
    const headers = rows[headerRowIndex].map(clean);
    const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
    if (duplicates.length) throw new Error(`The source file contains duplicate columns: ${[...new Set(duplicates)].join(", ")}.`);
    const sourceLayout = sameHeaders(headers, FLUTE_HEADERS) ? "flute"
      : sameHeaders(headers, FLUTE_CONFIRMATION_HEADERS) ? "fluteConfirmation"
      : sameHeaders(headers, PAPER_BAGS_HEADERS) ? "paperBags" : "";
    if (!sourceLayout) throw layoutError(headers);
    return rows.slice(headerRowIndex + 1).map((row, rowIndex) => ({ row, rowIndex })).filter(item => item.row.some(value => clean(value) !== "")).map(({ row, rowIndex }) => {
      const object = { __sourceRow: headerRowIndex + rowIndex + 2, __sourceLayout: sourceLayout };
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
    return ({ SA: "SK", SASK: "SK" })[code] || code;
  }

  // Keep UI and saved settings compatible; FedEx calls province fields "State".
  const EXPORT_FIELD_KEYS = { senderState: "senderProvince", recipientState: "recipientProvince" };

  function emptyFedExRow() {
    return Object.fromEntries(FEDEX_HEADERS.map(header => [EXPORT_FIELD_KEYS[header] || header, ""]));
  }

  function convertRecord(source, settings, sourceLayout = "flute") {
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
      sourceLayout,
      validationProfile: "flute",
      fedex: row,
      warnings: product ? [] : [`No product mapping was found for docket ${clean(source.docket_id) || "(blank)"}.`]
    };
    result.errors = validateFedExRow(row, result.validationProfile);
    result.status = result.errors.length ? "review" : "ready";
    return result;
  }

  function convertPaperBagsRecord(source, settings) {
    const row = emptyFedExRow();
    Object.assign(row, {
      poNumber: "",
      reference: "Paper Bags",
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
      recipientContactName: "Store Manager",
      recipientCompany: [clean(source["store #"]), clean(source.Banner)].filter(Boolean).join(" "),
      recipientContactNumber: clean(settings.recipientContactNumber),
      recipientEmail: clean(settings.recipientEmail),
      recipientLine1: clean(source.Address),
      recipientLine2: clean(source["Store Name"]),
      recipientLine3: "",
      recipientPostcode: normalizePostcode(source["Postal code"]),
      recipientProvince: normalizeProvince(source["Store State"], "Canada"),
      recipientCity: clean(source["Store City"]).toUpperCase(),
      recipientCountry: "CA",
      packageType: clean(settings.packageType),
      numberOfPackages: clean(source.QTY),
      packageWeight: 49,
      weightUnits: clean(settings.weightUnits),
      length: 24,
      width: 20,
      height: 11,
      currencyType: clean(settings.currencyType),
      serviceType: clean(settings.serviceType)
    });
    const result = {
      sourceRow: source.__sourceRow,
      sourceOrder: "",
      sourceLine: "",
      docketId: "",
      productKey: "PAPER-BAGS",
      sourceLayout: "paperBags",
      validationProfile: "paperBags",
      fedex: row,
      warnings: []
    };
    result.errors = validateFedExRow(row, result.validationProfile);
    result.status = result.errors.length ? "review" : "ready";
    return result;
  }

  function validateFedExRow(row, profile = "flute") {
    const errors = [];
    REQUIRED_FEDEX_FIELDS.forEach(field => {
      if (field === "poNumber" && profile === "paperBags") return;
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
    if (!sourceRows.length) throw new Error("The supported source layout contains headers but no shipment lines.");
    const effectiveSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    return sourceRows.map(source => source.__sourceLayout === "paperBags"
      ? convertPaperBagsRecord(source, effectiveSettings)
      : convertRecord(source, effectiveSettings, source.__sourceLayout));
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
        if (header === "poNumber" && shipment.validationProfile === "paperBags") value = "";
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
    FLUTE_HEADERS,
    FLUTE_CONFIRMATION_HEADERS,
    PAPER_BAGS_HEADERS,
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
    convertPaperBagsRecord,
    validateFedExRow,
    exportFedExCsv,
    normalizeCountry,
    normalizeCurrency,
    normalizePostcode,
    normalizeProvince
  };
});
