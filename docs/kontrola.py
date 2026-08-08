#!/usr/bin/env python3
"""Kontrola vnútornej súdržnosti dokumentácie.

Spúšťa sa pred odovzdaním čohokoľvek von:   python3 docs/kontrola.py

Kontroluje veci, ktoré sa pri ručnom prepisovaní rozídu ako prvé —
počty, prípony súborov, odkazy na dokumenty a sekcie. Nekontroluje
obsah; na to je čítanie.
"""
import re, os, sys, glob

docs = {p: open(p, encoding="utf-8").read() for p in sorted(glob.glob("docs/*.md"))}
prev = open("preview/index.html", encoding="utf-8").read()
k = docs["docs/01-koncept.md"]
chyby = []

rozhodnuti = max(int(m.group(1)) for m in re.finditer(r"^(\d+)\. \*\*", k, re.M))
kapitol    = len(re.findall(r"^## \d+\.", k, re.M))
obrazoviek = len(re.findall(r'data-screen="', prev))

def hlas(subor, co, detail):
    chyby.append((subor, co, detail))

for p, s in docs.items():
    for m in re.finditer(r"\.sql\.gz", s):
        hlas(p, "stará prípona zálohy", ".sql.gz → .tar.gz")
    for m in re.finditer(r"(\d+) rozhodnutí", s):
        if int(m.group(1)) != rozhodnuti:
            hlas(p, "počet rozhodnutí", f"{m.group(1)} ≠ {rozhodnuti}")
    for m in re.finditer(r"(\d+) kapitol", s):
        if int(m.group(1)) != kapitol:
            hlas(p, "počet kapitol", f"{m.group(1)} ≠ {kapitol}")
    for m in re.finditer(r"(\d+)\s*obrazoviek", s):
        if int(m.group(1)) != obrazoviek:
            hlas(p, "počet obrazoviek preview", f"{m.group(1)} ≠ {obrazoviek}")
    for m in re.finditer(r"`(\d\d-[a-z0-9-]+\.md)`", s):
        if not os.path.exists("docs/" + m.group(1)):
            hlas(p, "odkaz na neexistujúci dokument", m.group(1))

sekcie = set(re.findall(r"^#{2,4} (\d+\.?\d*[a-z]?)", k, re.M))
for p, s in docs.items():
    for m in re.finditer(r"\((?:koncept )?(\d\.\d[a-z]?)\)", s):
        if m.group(1) not in sekcie:
            hlas(p, "odkaz na neexistujúcu sekciu", m.group(1))

print(f"rozhodnutí {rozhodnuti} · kapitol {kapitol} · obrazoviek preview {obrazoviek}")
if chyby:
    print(f"\nNEZROVNALOSTI: {len(chyby)}\n")
    for p, co, det in chyby:
        print(f"  {p:34} {co:32} {det}")
    sys.exit(1)
print("dokumentácia je súdržná")
