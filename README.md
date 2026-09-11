# Stesco FedEx Batch Converter

A browser-only converter for turning a Flute order export into the 70-column FedEx batch CSV format used by the customer service team.

## Run locally

Open `dist/index.html` in a current browser. No installation or server is required.

For development with a local web server, run:

```bash
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

1. Drop a Flute CSV onto the upload area.
2. Review any highlighted rows.
3. Correct shipment details when needed.
4. Download the FedEx CSV.

Files are processed in browser memory. The app does not upload or retain order data. Shipment defaults are saved only in the current browser.

## Conversion rules

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

The repository contains no customer order files. Test data is generated inside the automated test. Files selected in the application remain in browser memory and are not uploaded.
