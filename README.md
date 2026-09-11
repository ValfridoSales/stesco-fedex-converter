# Stesco FedEx Batch Converter

A browser-only converter for turning a Flute order export into the 70-column FedEx batch CSV format used by the customer service team.

## Run locally

Open `dist/index.html` in a current browser. No installation or server is required.

For development with a local web server, run:

```bash
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

1. Drop one or more Flute CSV files onto the upload area. Use Add CSV files to extend the current batch.
2. Review any highlighted rows.
3. Correct shipment details when needed.
4. Resolve repeated Flute order-and-line combinations by removing the extra row or selecting Keep intentionally.
5. Download one combined FedEx CSV.

Each review row shows its source filename and CSV row number. If any newly selected file is invalid, none of that selection is added; the existing batch remains intact. Repeated PO numbers alone do not count as duplicates. Clear starts a new batch.

Files are processed in browser memory. The app does not upload or retain order data. Shipment defaults are saved only in the current browser.

## Conversion rules

- Province values export under FedEx's `senderState` and `recipientState` headers. Existing saved sender defaults remain compatible.
- For Canadian addresses, the export translates `QC` to FedEx's `PQ` and `NL` to `NF` for both sender and recipient. Editable values and saved defaults retain their original codes.

- FedEx `poNumber` comes from Flute `billing_po`.
- `numberOfPackages` comes from `order_qty`.
- Product weight is per package.
- `recipientContactName` comes from `ship_nme2`.
- `recipientCompany` comes from `ship_nme` without modification.
- Product reference, weight, and dimensions come from the included Foot Locker product map.
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
- `dist/converter.js` — CSV parsing, mapping, validation, and export logic
- `tests/converter.test.cjs` — conversion regression test

## Data handling

When all rows pass validation and duplicate review, a CSV tile appears beside the download controls. Dragging it supplies a generated CSV File to the browser drag operation; clicking it downloads the same file. Cross-website file transfer remains experimental and must be tested with the receiving FedEx portal and browser. The download button remains available.

The repository contains no customer order files. Test data is generated inside the automated test. Files selected in the application remain in browser memory and are not uploaded.
