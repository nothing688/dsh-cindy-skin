#!/usr/bin/env python3
"""在提取出来的 main bundle 里定位符号，输出命中位置与上下文片段。

用途：调研 DSH 的插件装载 / generation 投影机制时，把 `app.asar` 里的
`out/main/index.js` 提取出来（见 asar.py --get），再用本脚本快速定位
关键符号的实现位置。

用法：
  python scan_main.py OUT_MAIN_INDEX_JS [SYMBOL ...]

SYMBOL 缺省为下列一组（DSH Desktop 0.2.0-rc.x 实测存在）：
  projectGenerations / resolveEnabledGenerations / isGenerationPlugin /
  sweepRegistry / generationRegistry / generations/live / desired.json
"""
import re
import sys

DEFAULT_SYMBOLS = [
    "projectGenerations",
    "isGenerationPlugin",
    "sweepRegistry",
    "generationRegistry",
    "generations/live",
    "desired.json",
    "resolveEnabledGenerations",
]

if len(sys.argv) < 2:
    print(__doc__, file=sys.stderr)
    sys.exit(2)

path = sys.argv[1]
symbols = sys.argv[2:] or DEFAULT_SYMBOLS

with open(path, encoding="utf-8", errors="replace") as f:
    source = f.read()

for sym in symbols:
    hits = list(re.finditer(re.escape(sym), source))
    print(f"##### {sym}  -> {len(hits)} hit(s) @ {[m.start() for m in hits][:8]}")
    print()
    for m in hits[:2]:
        print("----", m.start())
        print(source[max(0, m.start() - 500): m.start() + 700])
        print()
