/* =====================================================================
   build.mjs — core pipeline: designed HTML -> print-ready PDF.
   ---------------------------------------------------------------------
   Steps:
     1. Read the source HTML.
     2. Inline local <img src="..."> as data URIs so the file is
        self-contained and path-independent (relative images break once
        the HTML is moved or rendered from a temp dir).
     3. Inject the generated print overlay CSS before </head>.
     4. Render to PDF with pagedjs-cli (Paged.js + headless Chrome),
        which preserves vector text/SVG and embeds fonts.

   This module exposes htmlToPrintPdf() for programmatic use; bin/cli.mjs
   is the command-line wrapper.
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrintCSS } from "./print-css.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/* Inline local <img src> references as data URIs. Leaves http(s):, data:,
   and absolute file URLs untouched. Missing files are left as-is (Paged.js
   will simply render a broken image, which is easier to spot than a silent
   substitution). */
function inlineImages(html, baseDir) {
  return html.replace(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi, (tag, src) => {
    if (/^(https?:|data:|file:|\/\/)/i.test(src)) return tag;
    const filePath = resolve(baseDir, decodeURIComponent(src));
    if (!existsSync(filePath)) {
      console.warn(`  ! image not found, left as-is: ${src}`);
      return tag;
    }
    const ext = extname(filePath).toLowerCase();
    const mime = MIME[ext];
    if (!mime) return tag;
    const data = readFileSync(filePath);
    const encoded =
      ext === ".svg"
        ? "utf8," + encodeURIComponent(data.toString("utf8"))
        : "base64," + data.toString("base64");
    const dataUri = `data:${mime};${encoded}`;
    return tag.replace(src, dataUri);
  });
}

/* Inject a <style> block with the print overlay just before </head>.
   If there's no <head>, prepend a minimal one. */
function injectCSS(html, css) {
  const style = `<style data-html-to-print-pdf>\n${css}</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${style}\n</head>`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/(<body[^>]*>)/i, `<head>${style}</head>\n$1`);
  }
  return `${style}\n${html}`;
}

function resolvePagedBin() {
  const isWin = process.platform === "win32";
  const binName = isWin ? "pagedjs-cli.cmd" : "pagedjs-cli";
  const candidates = [
    join(PKG_ROOT, "node_modules", ".bin", binName),
    join(process.cwd(), "node_modules", ".bin", binName),
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

/**
 * Convert a designed HTML file to a print-ready PDF.
 * @param {object} opts
 * @param {string} opts.input    path to the source HTML
 * @param {string} opts.output   path for the output PDF
 * @param {object} [opts.config] print-overlay config (see print-css.mjs)
 * @param {boolean} [opts.keepHtml] keep the intermediate *.print.html
 * @returns {{ pdf: string, html: string }}
 */
export function htmlToPrintPdf({ input, output, config = {}, keepHtml = false }) {
  const inputPath = resolve(input);
  if (!existsSync(inputPath)) throw new Error(`input not found: ${inputPath}`);

  const outputPath = resolve(
    output || inputPath.replace(/\.html?$/i, "") + ".pdf"
  );
  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const baseDir = dirname(inputPath);
  let html = readFileSync(inputPath, "utf8");

  console.log("• inlining local images");
  html = inlineImages(html, baseDir);

  console.log("• injecting print overlay CSS");
  html = injectCSS(html, buildPrintCSS(config));

  const printHtmlPath = outputPath.replace(/\.pdf$/i, "") + ".print.html";
  writeFileSync(printHtmlPath, html, "utf8");

  const bin = resolvePagedBin();
  if (!bin) {
    throw new Error(
      "pagedjs-cli not found. Run `npm install` in the package first."
    );
  }

  console.log("• rendering with Paged.js (headless Chrome)");
  const res = spawnSync(bin, [printHtmlPath, "-o", outputPath], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    throw new Error(`pagedjs-cli exited with code ${res.status}`);
  }

  if (!keepHtml) {
    try {
      unlinkSync(printHtmlPath);
    } catch {}
  }

  console.log(`✓ wrote ${outputPath}`);
  return { pdf: outputPath, html: keepHtml ? printHtmlPath : null };
}
