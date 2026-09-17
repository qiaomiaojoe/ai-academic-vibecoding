#!/usr/bin/env python3
"""知识库体检（kb-builder 附带）：断链 / 孤儿页 / 重复 title / frontmatter 缺字段。
用法：python3 lint.py      （在知识库根目录跑）"""
import re, os, sys

WIKI = "wiki"
REQUIRED = ["title", "category", "sources", "updated", "status"]
SPECIAL = ("index", "log", "素材总库")

def strip_code(t):
    t = re.sub(r"```.*?```", "", t, flags=re.S)
    return re.sub(r"`[^`\n]*`", "", t)

pages, titles, fm_missing = {}, {}, []
for dp, _, fs in os.walk(WIKI):
    for f in sorted(fs):
        if not f.endswith(".md"):
            continue
        name, path = f[:-3], os.path.join(dp, f)
        pages[name] = path
        txt = open(path, encoding="utf-8").read()
        m = re.match(r"^---\n(.*?)\n---", txt, re.S)
        if name in SPECIAL:
            continue
        if not m:
            fm_missing.append((name, "整个 frontmatter"))
            continue
        fm = m.group(1)
        for k in REQUIRED:
            if not re.search(rf"^{k}:\s*\S", fm, re.M):
                fm_missing.append((name, k))
        t = re.search(r"^title:\s*(.+)$", fm, re.M)
        if t:
            titles.setdefault(t.group(1).strip(), []).append(name)

missing, linked = {}, set()
for name, path in pages.items():
    txt = strip_code(open(path, encoding="utf-8").read())
    for link in re.findall(r"\[\[([^\]\|]+)", txt):
        link = link.strip()
        linked.add(link)
        if link not in pages:
            missing.setdefault(link, []).append(name)

idx = open(os.path.join(WIKI, "index.md"), encoding="utf-8").read()
orphans = [n for n, p in pages.items()
           if n not in SPECIAL
           and os.path.basename(p) not in idx]

print(f"页面 {len(pages)} 个\n")
print("== 断链（待写清单，不自动创建）==")
for k, v in sorted(missing.items()):
    print(f"  [[{k}]]  ← {', '.join(sorted(set(v)))}")
print(f"  共 {len(missing)} 条\n")
print("== 未被 index 收录的孤儿页 ==")
print("  " + ("\n  ".join(orphans) if orphans else "无") + "\n")
print("== 重复 title（同概念两页＝复利失效）==")
dup = {k: v for k, v in titles.items() if len(v) > 1}
print("  " + ("\n  ".join(f"{k}: {v}" for k, v in dup.items()) if dup else "无") + "\n")
print("== frontmatter 缺字段 ==")
print("  " + ("\n  ".join(f"{n} 缺 {k}" for n, k in fm_missing) if fm_missing else "无"))
sys.exit(0)
