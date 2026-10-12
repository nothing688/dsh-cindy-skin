#!/usr/bin/env python3
"""把 Inter 字体（base64 内联）织入 src/skin.js，生成插件根目录的 client.js。

用法：  python src/build.py
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "skin.js"
OUT = ROOT / "client.js"
FONT_DIR = ROOT / "fonts"
WEIGHTS = [400, 500, 600, 700]


def font_face(weight, path):
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return "\n".join(
        [
            "@font-face {",
            "  font-family: 'Inter';",
            "  font-style: normal;",
            f"  font-weight: {weight};",
            "  font-display: swap;",
            f"  src: url(data:font/woff2;base64,{data}) format('woff2');",
            "}",
        ]
    )


def main():
    blocks = []
    raw_total = 0
    for weight in WEIGHTS:
        path = FONT_DIR / f"inter-latin-{weight}-normal.woff2"
        if not path.exists():
            print(f"missing font file: {path}", file=sys.stderr)
            return 1
        raw_total += path.stat().st_size
        blocks.append(font_face(weight, path))

    css = "\n".join(blocks)
    source = SRC.read_text(encoding="utf-8")
    if '"__INTER_FONT_FACE__"' not in source:
        print("placeholder \"__INTER_FONT_FACE__\" not found in src/skin.js", file=sys.stderr)
        return 1

    output = source.replace('"__INTER_FONT_FACE__"', json.dumps(css))
    OUT.write_text(output, encoding="utf-8")
    print(
        f"client.js written: {OUT} "
        f"({len(output):,} chars; {raw_total:,} B of woff2 inlined)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
