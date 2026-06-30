#!/usr/bin/env node
/* =====================================================================
   cli.mjs — command-line wrapper for html-to-print-pdf.

   Usage:
     html-to-print-pdf <input.html> [options]

   Options:
     -o, --output <file>   output PDF path (default: <input>.pdf)
     -c, --config <file>   JSON config for the print overlay
         --size <value>    page size, e.g. A4 | Letter | "6in 9in"
         --margin <value>  CSS margin shorthand, e.g. "18mm"
         --no-page-numbers disable folios
         --no-toc          don't add live TOC page numbers
         --keep-html       keep the intermediate *.print.html
     -h, --help            show this help

   Config keys (see src/print-css.mjs DEFAULT_CONFIG for the full list)
   override CLI flags only when set; CLI flags win over the config file.
   ===================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { htmlToPrintPdf } from "../src/build.mjs";

const HELP = `html-to-print-pdf — designed HTML -> print-ready PDF

Usage:
  html-to-print-pdf <input.html> [options]

Options:
  -o, --output <file>   output PDF path (default: <input>.pdf)
  -c, --config <file>   JSON config for the print overlay
      --size <value>    page size, e.g. A4 | Letter | "6in 9in"
      --margin <value>  CSS margin shorthand, e.g. "18mm"
      --no-page-numbers disable folios
      --no-toc          don't add live TOC page numbers
      --keep-html       keep the intermediate *.print.html
  -h, --help            show this help
`;

function parseArgs(argv) {
  const args = { _: [], config: {}, keepHtml: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      case "-c":
      case "--config":
        args.configFile = argv[++i];
        break;
      case "--size":
        args.config.size = argv[++i];
        break;
      case "--margin":
        args.config.margin = argv[++i];
        break;
      case "--no-page-numbers":
        args.config.pageNumbers = false;
        break;
      case "--no-toc":
        args.config.tocLinkSelector = null;
        break;
      case "--keep-html":
        args.keepHtml = true;
        break;
      default:
        if (a.startsWith("-")) {
          console.error(`unknown option: ${a}`);
          process.exit(2);
        }
        args._.push(a);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  process.stdout.write(HELP);
  process.exit(args.help ? 0 : 1);
}

let fileConfig = {};
if (args.configFile) {
  const cfgPath = resolve(args.configFile);
  if (!existsSync(cfgPath)) {
    console.error(`config not found: ${cfgPath}`);
    process.exit(2);
  }
  fileConfig = JSON.parse(readFileSync(cfgPath, "utf8"));
}

// CLI flags win over the config file.
const config = { ...fileConfig, ...args.config };

try {
  htmlToPrintPdf({
    input: args._[0],
    output: args.output,
    config,
    keepHtml: args.keepHtml,
  });
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
