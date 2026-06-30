# Example: sample report

A self-contained report that exercises every feature of the print overlay:

- a **cover** with no page number (`.cover`)
- an **imprint** page where the visible page count restarts at 1 (`.imprint`)
- a **table of contents** whose page numbers are computed at layout time
- body sections with a **table** and an inline-SVG **figure**
- pagination guards so headings, tables, and figures don't break badly

## Build it

From the project root:

```bash
npm run example
```

This is equivalent to:

```bash
node bin/cli.mjs examples/report/report.html \
  -o examples/report/report.pdf \
  --config examples/report/print.config.json
```

Output: `report.pdf` (ignored by git — regenerate it locally).

## Files

| File | Purpose |
| --- | --- |
| `report.html` | The designed source document (screen + print). |
| `print.config.json` | Overlay config pointing at this document's selectors. |
