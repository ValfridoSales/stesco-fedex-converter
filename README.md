# Stesco FedEx Batch Converter

A browser-only converter for turning supported Flute and Paper Bags `.xls`, `.xlsx`, or `.csv` exports into the 70-column FedEx batch CSV format used by the customer service team.

## Run locally

Open `dist/index.html` in a current browser. No installation or server is required.

For development with a local web server, run:

```bash
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

1. Drop one or more supported Flute or Paper Bags `.xls`, `.xlsx`, or `.csv` files onto the upload area. Formats and layouts can be mixed in one batch; use Add files to extend it.
2. Review any highlighted rows.
3. Correct shipment details when needed.
4. Resolve repeated Flute order-and-line combinations by removing the extra row or selecting Keep intentionally.
5. Download one combined FedEx CSV.

Each review row shows its source filename, source format, and row number. The first worksheet is used for Excel workbooks. Both supported layouts require their exact known column names and order. If a file does not match, none of that selection is added. If a batch was already staged, download is blocked until the batch is cleared and all intended files are uploaded again. Repeated PO numbers alone do not count as duplicates. Clear starts a new batch.

Files are processed in browser memory. The app does not upload or retain order data. Shipment defaults are saved only in the current browser.

The bundled SheetJS Community Edition reader handles legacy Excel 97–2003 `.xls` files and modern `.xlsx` files locally, so the app does not require a network connection while converting orders.

## Conversion rules

- Province values export under FedEx's `senderState` and `recipientState` headers. Existing saved sender defaults remain compatible.
- Flute's Saskatchewan code `SA` is normalized to the standard `SK` during import. Valid `SK` values remain unchanged.
- For Canadian addresses, the export translates `QC` to FedEx's `PQ` and `NL` to `NF` for both sender and recipient. It also protects against a manually entered `SA` by exporting it as `SK`.

- FedEx `poNumber` comes from Flute `billing_po`.
- `numberOfPackages` comes from `order_qty`.
- Product weight is per package.
- `recipientContactName` comes from `ship_nme2`.
- `recipientCompany` comes from `ship_nme` without modification.
- Product reference, weight, and dimensions come from the included Foot Locker product map.
- Paper Bags rows use `store # + Banner` as the recipient company, `Address` as address line 1, and `Store Name` as address line 2.
- Paper Bags rows use `Store Manager` as the contact, `Paper Bags` as the reference, a blank PO, and Canada as the country.
- Paper Bags `QTY` supplies the package count. Every package is 49 lb and 24 × 20 × 11 in.
- Paper Bags province code `SASK` is normalized to `SK`; `div` and `Delivery Time (Days)` are intentionally ignored.
- The downloaded file always uses the FedEx template's 70 headers in their required order.

## Test

From the project folder, run:

```bash
node tests/converter.test.cjs
```

The same test runs automatically in GitHub Actions whenever code is pushed or a pull request is opened.

## Repository structure

- `dist/index.html` — application interface
- `dist/styles.css` — visual design and responsive layout
- `dist/app.js` — browser interactions and review workflow
- `dist/importer.js` — local CSV/XLS/XLSX file reading and normalization
- `dist/xlsx.full.min.js` — bundled SheetJS Community Edition workbook reader
- `dist/converter.js` — CSV parsing, mapping, validation, and export logic
- `tests/converter.test.cjs` — conversion regression test

## Data handling

Each selected supported source file is shown separately in the results area with an XLS, XLSX, or CSV badge, layout name, filename, and shipment-line count. When all rows pass validation and duplicate review, use **Download FedEx CSV** to create the single combined upload file.

The repository contains no customer order files. Test data is generated inside the automated test. Files selected in the application remain in browser memory and are not uploaded.
