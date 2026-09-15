const assert = require("node:assert/strict");
const C = require("../dist/converter.js");
const XLSX = require("../dist/xlsx.full.min.js");
const I = require("../dist/importer.js");

const inputHeaders = [
  "billing_po", "ship_nme", "ship_nme2", "ship_add1", "ship_add2", "ship_city", "ship_prov",
  "ship_posta", "ship_count", "order_qty", "docket_id", "docket_txt", "order_id", "order_line", "currency_d"
];
const productRows = [
  ["1", "120073", "[FOOLOC-061] Medium Kit"],
  ["2", "120067", "[FOOLOC-060] Small Plus Kit"],
  ["1", "120074", "[FOOLOC-062] X-Large Kit"],
  ["1", "120075", "[FOOLOC-063] Multi XXL Kit"],
  ["1", "121985", "[FOOLOC-072] MED Mailer"],
  ["1", "121986", "[FOOLOC-073] LRG Mailer"]
];
const inputRows = productRows.map(([quantity, docketId, description], index) => [
  "TEST-PO-1001", "100 TEST STORE", "Attn: Test User", "123 TEST STREET", "", "TORONTO", "ON",
  "M1M 1M1", "CANADA", quantity, docketId, description, "TEST-ORDER-1", String(index + 1), "CAD"
]);
const input = [inputHeaders, ...inputRows].map(row => row.join(",")).join("\r\n") + "\r\n";
const templateHeaders = "poNumber,reference,senderContactName,senderCompany,senderContactNumber,senderEmail,senderLine1,senderLine2,senderPostcode,senderProvince,senderCity,senderCountry,recipientContactName,recipientCompany,recipientContactNumber,recipientEmail,recipientLine1,recipientLine2,recipientLine3,recipientPostcode,recipientProvince,recipientCity,recipientCountry,packageType,numberOfPackages,packageWeight,weightUnits,length,width,height,currencyType,oneRatePricing,commodityType,itemDescription,harmonizedCode,manufacturingCountry,commodityQuantity,commodityMeasureUnit,commodityWeight,customsValue,documentType,documentDescription,purposeOfShipment,generateInvoice,etdEnabled,serviceType,soldToPartyCountry,soldToPartyContactName,soldToPartyCompany,soldToPartyLine1,soldToPartyLine2,soldToPartyLine3,soldToPartyCity,soldToPartyState,soldToPartyPostcode,soldToPartyPhoneExtension,soldToPartyContactNumber,soldToPartyTin,soldToPartyEmail,soldToPartyAccountNumber,cpscProductId,cpscProductIdType,cpscDisclaimCode,cpscIntendedUseCode,cpscIntendedUseDescription,cpscProductVersion,cpscCertifierId,euDeMinimisMerchantProductId,euDeMinimisNonStandardManufacturerProductId,euDeMinimisStandardManufacturerProductId".split(",");
const shipments = C.convertCsv(input, C.DEFAULT_SETTINGS);

assert.equal(C.FEDEX_HEADERS.length, 70, "FedEx output must contain 70 columns");
const correctedHeaders = templateHeaders.map(header => ({ senderProvince: "senderState", recipientProvince: "recipientState" }[header] || header));
assert.deepEqual(C.FEDEX_HEADERS, correctedHeaders, "FedEx headers must use the documented State names");
assert.equal(shipments.length, 6, "Every Flute line must produce one FedEx row");
assert.ok(shipments.every(item => item.status === "ready"), "The supplied Flute sample should be ready to export");
assert.ok(shipments.every(item => item.fedex.poNumber === "TEST-PO-1001"), "billing_po must populate poNumber");
assert.ok(shipments.every(item => item.fedex.recipientContactName === "Attn: Test User"), "ship_nme2 must populate recipientContactName");
assert.ok(shipments.every(item => item.fedex.recipientCompany === "100 TEST STORE"), "ship_nme must populate recipientCompany without modification");
assert.deepEqual(shipments.map(item => item.fedex.reference), ["Medium", "Small Plus", "X-Large", "Multi XXL", "MED Mailer", "LRG Mailer"]);
assert.equal(shipments[0].fedex.packageWeight, 33, "Medium must use 33 lb per package");
assert.deepEqual(
  [shipments[0].fedex.length, shipments[0].fedex.width, shipments[0].fedex.height],
  [26, 12, 16],
  "Medium dimensions must match the product reference"
);
assert.deepEqual(shipments.map(item => item.fedex.numberOfPackages), ["1", "2", "1", "1", "1", "1"], "order_qty must populate numberOfPackages");
assert.ok(shipments.every(item => item.fedex.recipientPostcode === "M1M1M1"), "Canadian postal codes must be normalized");
assert.ok(shipments.every(item => item.fedex.recipientCountry === "CA"), "Canada must normalize to CA");

const editedBlank = { ...shipments[0].fedex, recipientLine1: "" };
assert.ok(
  C.validateFedExRow(editedBlank).includes("recipientLine1 is required."),
  "A required field must become invalid again when its edited value is deleted"
);

const output = C.exportFedExCsv(shipments);
const outputRows = C.parseCsv(output);
assert.equal(outputRows[1][outputRows[0].indexOf("senderState")], "ON");
assert.equal(outputRows[1][outputRows[0].indexOf("recipientState")], "ON");
const editedProvince = { ...shipments[0], fedex: { ...shipments[0].fedex, recipientProvince: "QC" } };
assert.equal(C.parseCsv(C.exportFedExCsv([editedProvince]))[1][outputRows[0].indexOf("recipientState")], "PQ", "Canadian QC must export as FedEx PQ, including manual edits");
for (const [input, expected] of [["QC", "PQ"], ["NL", "NF"], ["PQ", "PQ"], ["NF", "NF"], ["ON", "ON"], [" qc ", "PQ"]]) {
  const row = { fedex: { ...shipments[0].fedex, senderProvince: input, recipientProvince: input } };
  const values = C.parseCsv(C.exportFedExCsv([row]))[1];
  for (const field of ["senderState", "recipientState"]) assert.equal(values[outputRows[0].indexOf(field)], expected);
  assert.equal(row.fedex.recipientProvince, input, "Export must not modify editable province values");
}
const foreign = { fedex: { ...shipments[0].fedex, senderCountry: "US", recipientCountry: "US", senderProvince: "QC", recipientProvince: "NL" } };
const foreignValues = C.parseCsv(C.exportFedExCsv([foreign]))[1];
assert.equal(foreignValues[outputRows[0].indexOf("senderState")], "QC", "Canadian aliases must not apply to other countries");
assert.equal(foreignValues[outputRows[0].indexOf("recipientState")], "NL");

const saskatchewanInput = input.replace(",ON,M1M 1M1,CANADA,", ",SA,M1M 1M1,CANADA,");
const saskatchewan = C.convertCsv(saskatchewanInput, C.DEFAULT_SETTINGS);
assert.equal(saskatchewan[0].fedex.recipientProvince, "SK", "Flute SA must normalize to Saskatchewan SK during import");
const saskatchewanOutput = C.parseCsv(C.exportFedExCsv([saskatchewan[0]]));
assert.equal(saskatchewanOutput[1][saskatchewanOutput[0].indexOf("recipientState")], "SK", "Saskatchewan must export to FedEx as SK");
assert.equal(C.normalizeProvince("SK", "Canada"), "SK", "Valid Saskatchewan SK must remain unchanged");
assert.equal(C.normalizeProvince("SA", "US"), "SA", "Flute's Canadian alias must not be applied to other countries");
const manuallyEditedSa = { fedex: { ...shipments[0].fedex, recipientProvince: "SA" } };
assert.equal(C.parseCsv(C.exportFedExCsv([manuallyEditedSa]))[1][outputRows[0].indexOf("recipientState")], "SK", "A manually entered Canadian SA must export as SK");
assert.equal(outputRows.length, 7, "Export must contain one header plus six data rows");
assert.ok(outputRows.every(row => row.length === 70), "Every output row must contain all 70 FedEx columns");

const multiline = C.parseCsv('a,b\r\n"line 1\nline 2","quoted ""value"""\r\n');
assert.equal(multiline[1][0], "line 1\nline 2", "Parser must support multiline quoted fields");
assert.equal(multiline[1][1], 'quoted "value"', "Parser must support escaped quotes");

assert.throws(
  () => C.convertCsv("billing_po,ship_nme\r\n1,Store\r\n", C.DEFAULT_SETTINGS),
  /Missing columns/,
  "Unexpected Flute schemas must be rejected"
);

const unknownCsv = input.replace("[FOOLOC-061] Medium Kit", "[FOOLOC-999] Unknown Kit").replace(",120073,", ",999999,");
const unknown = C.convertCsv(unknownCsv, C.DEFAULT_SETTINGS);
assert.equal(unknown[0].status, "review", "Unknown products must be blocked for review");
assert.ok(unknown[0].errors.some(error => error.startsWith("reference")), "Unknown products must show missing reference");

const batch = C.convertFiles([{ name: "one.csv", text: input }, { name: "two.csv", text: input.replaceAll("TEST-ORDER-1", "TEST-ORDER-2") }]);
assert.equal(batch.length, 12);
assert.equal(batch[6].sourceFile, "two.csv");
assert.equal(batch[6].sourceFileIndex, 1);
assert.equal(C.parseCsv(C.exportFedExCsv(batch)).length, 13, "Combined output has exactly one header");
assert.deepEqual(C.duplicateIndexes(batch), [], "Shared PO across different orders is allowed");
const repeated = C.convertFiles([{ name: "one.csv", text: input }, { name: "overlap.csv", text: input }]);
assert.deepEqual(C.duplicateIndexes(repeated), [6, 7, 8, 9, 10, 11]);
repeated[6].duplicateConfirmed = true;
assert.deepEqual(C.duplicateIndexes(repeated), [7, 8, 9, 10, 11]);
assert.deepEqual(C.duplicateIndexes([{sourceOrder:"",sourceLine:"1"},{sourceOrder:"",sourceLine:"1"}]), [], "Missing order IDs are not treated as duplicate keys");
assert.throws(() => C.convertFiles([{name:"good.csv",text:input},{name:"bad.csv",text:"wrong\n1"}]), /bad.csv:.*Missing columns/);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([inputHeaders, ...inputRows]), "order_jit_ships");
for (const bookType of ["xls", "xlsx"]) {
  const buffer = XLSX.write(workbook, { type: "buffer", bookType });
  const rows = I.workbookToRows(buffer);
  const excelShipments = C.convertFiles([{ name: `sample.${bookType}`, type: bookType.toUpperCase(), rows }]);
  assert.equal(excelShipments.length, shipments.length, `${bookType.toUpperCase()} must import every Flute row`);
  assert.deepEqual(
    excelShipments.map(item => item.fedex),
    shipments.map(item => item.fedex),
    `${bookType.toUpperCase()} and CSV inputs must produce identical FedEx mappings`
  );
  assert.equal(excelShipments[0].sourceFile, `sample.${bookType}`);
}
assert.equal(I.fileTypeLabel("ORDER.XLS"), "XLS");
assert.equal(I.fileTypeLabel("order.xlsx"), "XLSX");
assert.equal(I.fileTypeLabel("order.csv"), "CSV");
assert.equal(I.fileTypeLabel("order.txt"), "");

const mixed = C.convertFiles([
  { name: "one.csv", type: "CSV", text: input },
  { name: "two.xls", type: "XLS", rows: I.workbookToRows(XLSX.write(workbook, { type: "buffer", bookType: "xls" })) }
]);
assert.equal(mixed.length, 12, "Mixed CSV and XLS files must create one combined batch");
assert.equal(C.parseCsv(C.exportFedExCsv(mixed)).length, 13, "Mixed-file output must contain one header");

console.log("Passed: CSV/XLS/XLSX conversion, SA-to-SK and FedEx province aliases, combined files, source tracking and duplicate checks.");
