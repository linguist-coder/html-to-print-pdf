#!/usr/bin/env python3
"""verify.py — optional sanity check for a rendered PDF.

Reports page count and, per page, whether a folio (page number) is present,
then prints any table-of-contents lines it finds with their trailing numbers.
It also scans for contact details (email / URL / phone) — useful before
attaching a sample to a platform (e.g. Upwork) that blocks pre-contract
contact sharing.

Requires PyMuPDF:  pip install pymupdf
Usage:             python scripts/verify.py path/to/output.pdf
"""

import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF not installed. Run: pip install pymupdf")

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL = re.compile(r"https?://\S+|www\.\S+")
PHONE = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")


def main(path: str) -> int:
    doc = fitz.open(path)
    print(f"file: {path}")
    print(f"pages: {doc.page_count}\n")

    contacts = {"email": set(), "url": set(), "phone": set()}

    for i, page in enumerate(doc, start=1):
        text = page.get_text()
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        # crude folio test: a line that is just a number (folios sit in the
        # page margin box; PyMuPDF may place that text anywhere in the stream)
        has_folio = any(re.fullmatch(r"\d{1,4}", ln) for ln in lines)
        print(f"  page {i:>3}: {'folio' if has_folio else 'no folio':<9} "
              f"({len(lines)} text lines)")

        contacts["email"].update(EMAIL.findall(text))
        contacts["url"].update(URL.findall(text))
        contacts["phone"].update(
            m for m in PHONE.findall(text) if len(re.sub(r"\D", "", m)) >= 9
        )

    print("\ncontact scan:")
    any_hit = False
    for kind, hits in contacts.items():
        if hits:
            any_hit = True
            print(f"  ! {kind}: {', '.join(sorted(hits))}")
    if not any_hit:
        print("  clean - no email / URL / phone found")

    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/verify.py <pdf>")
    raise SystemExit(main(sys.argv[1]))
