# html-to-print-pdf

Turn **designed HTML/CSS into a print-ready PDF** — with page numbers and a
live table of contents — from one command. No manual layout, no watermark, no
licensing cost.

The same HTML that renders in a browser becomes a paginated document with
folios, restarted page counts, and a TOC whose page references are computed at
layout time. Built on the open-source [Paged.js](https://pagedjs.org/) engine,
so the whole pipeline can be handed to a client freely.

## What it does

Given a designed HTML file, the tool runs four deterministic steps and leaves
the document's own visual design untouched:

1. **Read** the source HTML.
2. **Inline** local images as data URIs so the file is self-contained and
   path-independent.
3. **Overlay** print CSS — page size, margins, page numbers, and live TOC
   references — generated from your config.
4. **Render** to PDF with Paged.js (headless Chrome): vector text and SVG are
   preserved and fonts are embedded.

## Install

```bash
git clone https://github.com/linguist-coder/html-to-print-pdf.git
cd html-to-print-pdf
npm install
```

`npm install` pulls in `pagedjs-cli`, which downloads a headless Chromium on
first run. Node 18+ required.

## Usage

```bash
# simplest: HTML in, PDF out (next to the input)
node bin/cli.mjs report.html

# with options
node bin/cli.mjs report.html -o out/report.pdf --size A4 --margin 18mm

# drive everything from a config file
node bin/cli.mjs report.html -c print.config.json
```

### Options

| Flag | Description |
| --- | --- |
| `-o, --output <file>` | Output PDF path (default: `<input>.pdf`) |
| `-c, --config <file>` | JSON config for the print overlay |
| `--size <value>` | Page size: `A4`, `Letter`, `"6in 9in"`, … |
| `--margin <value>` | CSS margin shorthand, e.g. `"18mm"` |
| `--no-page-numbers` | Disable folios |
| `--no-toc` | Don't add live TOC page numbers |
| `--keep-html` | Keep the intermediate `*.print.html` (useful for debugging) |
| `-h, --help` | Show help |

CLI flags override the config file.

### Config

All keys are optional; defaults live in
[`src/print-css.mjs`](src/print-css.mjs).

```jsonc
{
  "size": "A4",                       // page size
  "margin": "18mm",                   // CSS margin shorthand
  "pageNumbers": true,
  "pageNumberPosition": "bottom-center", // bottom-center | bottom-left | bottom-right
  "pageNumberColor": "#444444",
  "coverSelector": ".cover",          // this element gets its own page, no folio
  "startCounterSelector": ".imprint", // visible page count restarts here
  "tocLinkSelector": ".toc a[href^=\"#\"]", // these links get live page numbers
  "paginationSafety": true            // keep-together / no orphaned headings
}
```

To match your own HTML, point `coverSelector`, `startCounterSelector`, and
`tocLinkSelector` at the classes/selectors your markup already uses.

## Try the example

```bash
npm run example
# -> examples/report/report.pdf
```

[`examples/report/`](examples/report/) is a self-contained sample report
(cover, imprint, TOC, sections, a table and a figure) that exercises every
feature.

## Verify a rendered PDF (optional)

[`scripts/verify.py`](scripts/verify.py) is a small PyMuPDF sanity check: it
reports the page count, flags whether each page carries a folio, and scans for
contact details (email / URL / phone) — handy before attaching a sample to a
platform that blocks pre-contract contact sharing.

```bash
pip install pymupdf
python scripts/verify.py examples/report/report.pdf
```

## How the TOC works

Each table-of-contents link points at an anchor (`<a href="#section-id">`). The
overlay appends the real page number with CSS Paged Media's
`target-counter(attr(href), page)`, which Paged.js resolves **after** layout.
Move content around and the numbers stay correct — no manual updates.

## Notes & trade-offs

- **CSS Grid doesn't fragment across pages.** A grid block jumps whole to the
  next page and can strand a heading. Convert long grids to multi-column
  (`column-count`) when they need to flow.
- **Paged.js can't resolve `var()` inside `@page` rules**, so page geometry is
  written with literal values.
- **Web-font headings render correctly but aren't extractable as text** —
  verify content against body text and a rendered page image.
- **vs. Prince XML:** commercial / watermarked free tier. Paged.js is free and
  watermark-free, so you can ship the pipeline itself.
- **vs. browser "Print to PDF":** can't compute TOC page references or restart
  folios.

## License

MIT © [linguist-coder](https://github.com/linguist-coder)
