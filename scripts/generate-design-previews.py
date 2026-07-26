#!/usr/bin/env python3
"""Generate /design-* preview copies from root HTML. Root site is never modified."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "index.html",
    "buying.html",
    "selling.html",
    "evaluation.html",
    "guides.html",
    "reviews.html",
    "contact.html",
]

DESIGNS = [
    {
        "id": "design-original",
        "theme": None,
        "fonts": None,  # keep page fonts
    },
    {
        "id": "design-quiet-luxury",
        "theme": "quiet-luxury.css",
        "fonts": "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&family=Manrope:wght@400;500;600&display=swap",
    },
    {
        "id": "design-modern-tech",
        "theme": "modern-tech.css",
        "fonts": "family=Inter:wght@400;500;600;700&display=swap",
    },
    {
        "id": "design-classic-luxury",
        "theme": "classic-luxury.css",
        "fonts": "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap",
    },
]


def transform(html: str, design: dict) -> str:
    out = html

    # Asset paths (shared from site root)
    out = out.replace('href="styles.css"', 'href="../styles.css"')
    out = out.replace('src="greta-tengattini.jpg"', 'src="../greta-tengattini.jpg"')
    out = out.replace('src="evaluation.js"', 'src="../evaluation.js"')

    # Optional theme stylesheet + switcher assets after base styles
    extra_links = [
        '    <link rel="stylesheet" href="../themes/design-switcher.css" />',
    ]
    if design["theme"]:
        extra_links.insert(
            0,
            f'    <link rel="stylesheet" href="../themes/{design["theme"]}" />',
        )
    styles_anchor = '    <link rel="stylesheet" href="../styles.css" />'
    out = out.replace(
        styles_anchor,
        styles_anchor + "\n" + "\n".join(extra_links),
    )

    # Optional font swap for themed previews
    if design["fonts"]:
        out = re.sub(
            r'href="https://fonts\.googleapis\.com/css2\?[^"]+"',
            f'href="https://fonts.googleapis.com/css2?{design["fonts"]}"',
            out,
            count=1,
        )

    # Preview metadata
    robots = '    <meta name="robots" content="noindex,nofollow" />\n'
    if 'name="robots"' not in out:
        out = out.replace(
            '    <meta charset="UTF-8" />\n',
            '    <meta charset="UTF-8" />\n' + robots,
        )

    # Switcher script before </body>
    switcher = '    <script src="../themes/design-switcher.js" defer></script>\n'
    if "design-switcher.js" not in out:
        out = out.replace("</body>", switcher + "  </body>")

    # Mark body for theme targeting if needed
    theme_class = design["id"]
    out = re.sub(
        r"<body([^>]*)>",
        rf'<body\1 class="design-preview {theme_class}">',
        out,
        count=1,
    )
    # Avoid double class if body already has class
    out = re.sub(
        r'class="([^"]*)" class="design-preview [^"]+"',
        rf'class="\1 design-preview {theme_class}"',
        out,
        count=1,
    )

    return out


def main() -> None:
    for design in DESIGNS:
        dest_dir = ROOT / design["id"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        for page in PAGES:
            src = ROOT / page
            if not src.exists():
                raise SystemExit(f"Missing source page: {page}")
            html = src.read_text(encoding="utf-8")
            (dest_dir / page).write_text(transform(html, design), encoding="utf-8")
        print(f"Generated {design['id']}/ ({len(PAGES)} pages)")

    hub = ROOT / "design-original" / "README.txt"
    hub.write_text(
        "Design preview routes (visual experiments only).\n"
        "Root website pages are unchanged.\n"
        "Regenerate with: python3 scripts/generate-design-previews.py\n",
        encoding="utf-8",
    )
    print("Done.")


if __name__ == "__main__":
    main()
