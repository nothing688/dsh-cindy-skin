#!/usr/bin/env python3
"""Minimal read-only ASAR inspector (Electron app.asar).

Header layout (Electron asar / chromium pickle):
  [0:4]   uint32 = 4            (size of the outer pickle payload)
  [4:8]   uint32 = headerSize   (pickle string length + 8)
  [8:12]  uint32 = jsonSize
  [12:16] uint32 = pickle length
  [16:16+headerSize-8] = UTF-8 JSON directory
  data base = 8 + headerSize; entry "offset" is relative to base.

Usage:
  python asar.py --list [PREFIX]
  python asar.py --get INNER_PATH --out OUT_PATH
  python asar.py --grep PATTERN [--prefix PREFIX] [--ext .js] [--limit N]
"""
import argparse
import json
import os
import re
import sys

# DSH Desktop 安装目录下的 app.asar。各机器路径不同：
# 优先用 --asar 指定，其次读环境变量 DSH_ASAR，最后回落到这里的默认值。
DEFAULT_ASAR = os.environ.get(
    "DSH_ASAR",
    r"C:\Users\LHT\AppData\Local\Programs\DSH Desktop\resources\app.asar",
)


def load_directory(path):
    with open(path, "rb") as f:
        head = f.read(16)
        header_size = int.from_bytes(head[4:8], "little")
        f.seek(16)
        raw = f.read(max(0, header_size - 8))
    directory, _end = json.JSONDecoder().raw_decode(raw.decode("utf-8"))
    return directory, 8 + header_size


def walk(node, prefix=""):
    for name, entry in node.get("files", {}).items():
        path = f"{prefix}/{name}" if prefix else name
        if "files" in entry:
            yield from walk(entry, path)
        else:
            yield path, entry


def read_file(asar, base, entry):
    offset = int(entry.get("offset", 0))
    size = int(entry.get("size", 0))
    with open(asar, "rb") as f:
        f.seek(base + offset)
        return f.read(size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--asar", default=DEFAULT_ASAR)
    ap.add_argument("--list", nargs="?", const="", default=None)
    ap.add_argument("--get")
    ap.add_argument("--out")
    ap.add_argument("--grep")
    ap.add_argument("--prefix", default="")
    ap.add_argument("--ext", default="")
    ap.add_argument("--limit", type=int, default=40)
    args = ap.parse_args()

    directory, base = load_directory(args.asar)

    if args.list is not None:
        rows = [(p, e) for p, e in walk(directory) if p.startswith(args.list)]
        rows.sort()
        for path, entry in rows:
            print(f"{int(entry.get('size', 0)):>10}  {path}")
        print(f"--- {len(rows)} file(s) ---")
        return

    if args.get:
        for path, entry in walk(directory):
            if path == args.get:
                data = read_file(args.asar, base, entry)
                if args.out:
                    with open(args.out, "wb") as f:
                        f.write(data)
                    print(f"wrote {len(data)} bytes -> {args.out}")
                else:
                    sys.stdout.write(data.decode("utf-8", "replace"))
                return
        print(f"not found: {args.get}", file=sys.stderr)
        sys.exit(1)

    if args.grep:
        pattern = re.compile(args.grep)
        hits = 0
        for path, entry in walk(directory):
            if args.prefix and not path.startswith(args.prefix):
                continue
            if args.ext and not path.endswith(args.ext):
                continue
            data = read_file(args.asar, base, entry)
            if len(data) > 12_000_000:
                continue
            text = data.decode("utf-8", "replace")
            for lineno, line in enumerate(text.splitlines(), 1):
                if pattern.search(line):
                    snippet = line.strip()
                    if len(snippet) > 300:
                        pos = pattern.search(snippet).start()
                        snippet = snippet[max(0, pos - 120):pos + 180]
                    print(f"{path}:{lineno}: {snippet}")
                    hits += 1
                    if hits >= args.limit:
                        print(f"--- stopped at limit {args.limit} ---")
                        return
        print(f"--- {hits} hit(s) ---")
        return

    ap.print_help()


if __name__ == "__main__":
    main()
