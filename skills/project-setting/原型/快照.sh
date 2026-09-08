#!/bin/bash
# 冻结当前工作台 HTML 为一份带版本号的只读快照。
# 用法：在 工作台/ 文件夹下跑 ./快照.sh
set -e
cd "$(dirname "$0")"

SRC=$(ls *.html 2>/dev/null | head -1)
[ -n "$SRC" ] || { echo "这个文件夹里没有 .html"; exit 1; }

VER=$(grep -m1 'const WB_VERSION' "$SRC" | sed -E 's/.*"([^"]+)".*/\1/')
[ -n "$VER" ] || { echo "没在 $SRC 里读到 WB_VERSION"; exit 1; }

BASE="${SRC%.html}"
mkdir -p 工作台版本
DST="工作台版本/${BASE}-v${VER}.html"

if [ -f "$DST" ]; then
  echo "⚠️  v${VER} 的快照已存在：$DST"
  echo "    要么先把 WB_VERSION 加 0.1，要么手动删掉旧快照再跑。"
  exit 1
fi

cp "$SRC" "$DST"
chmod 444 "$DST"
echo "✅ 已冻结 v${VER} → $DST"
echo "   别忘了在 工作台版本/CHANGELOG.md 记一条这版改了什么。"
