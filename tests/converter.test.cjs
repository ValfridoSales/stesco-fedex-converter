const assert = require("node:assert/strict");
const C = require("../dist/converter.js");

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
assert.deepEqual(C.FEDEX_HEADERS, templateHeaders, "FedEx headers must exactly match the supplied template");
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

console.log(`Passed: ${shipments.length} Flute rows converted to ${C.FEDEX_HEADERS.length}-column FedEx output.`);
