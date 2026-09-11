const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../dist/converter.js");

const fixture = path.resolve(__dirname, "../../upload/03-Fluteexport.csv");
const template = path.resolve(__dirname, "../../upload/02-FedExExportTemplate.csv");
const input = fs.readFileSync(fixture, "utf8");
const templateHeaders = C.parseCsv(fs.readFileSync(template, "utf8"))[0];
const shipments = C.convertCsv(input, C.DEFAULT_SETTINGS);

assert.equal(C.FEDEX_HEADERS.length, 70, "FedEx output must contain 70 columns");
assert.deepEqual(C.FEDEX_HEADERS, templateHeaders, "FedEx headers must exactly match the supplied template");
assert.equal(shipments.length, 6, "Every Flute line must produce one FedEx row");
assert.ok(shipments.every(item => item.status === "ready"), "The supplied Flute sample should be ready to export");
assert.ok(shipments.every(item => item.fedex.poNumber === "202847"), "billing_po must populate poNumber");
assert.ok(shipments.every(item => item.fedex.recipientContactName === "Attn: Kayla Williams"), "ship_nme2 must populate recipientContactName");
assert.ok(shipments.every(item => item.fedex.recipientCompany === "99288 KIDS FOOTLOCKER CANADA"), "ship_nme must populate recipientCompany without modification");
assert.deepEqual(shipments.map(item => item.fedex.reference), ["Medium", "Small Plus", "X-Large", "Multi XXL", "MED Mailer", "LRG Mailer"]);
assert.equal(shipments[0].fedex.packageWeight, 33, "Medium must use 33 lb per package");
assert.deepEqual(
  [shipments[0].fedex.length, shipments[0].fedex.width, shipments[0].fedex.height],
  [26, 12, 16],
  "Medium dimensions must match the product reference"
);
assert.deepEqual(shipments.map(item => item.fedex.numberOfPackages), ["1", "2", "1", "1", "1", "1"], "order_qty must populate numberOfPackages");
assert.ok(shipments.every(item => item.fedex.recipientPostcode === "M2J5A7"), "Canadian postal codes must be normalized");
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
