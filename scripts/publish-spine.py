#!/usr/bin/env python3
"""
Publish step: AOTH Spine (Airtable) -> paintings.json

Projects Publish-ticked painting cards into the site's paintings.json.

GUARDRAIL ZERO — the whitelist below is the ONLY data that ever leaves
the spine. Collector names, notes, invoices, tokens, locations, AI notes:
the script does not read them, so it cannot leak them. Never add a field
here without deciding it is public.

Carousel rules (live now):
  a card is published when  Publish-to-site is ticked
  AND ("Live from" is empty or today/past)
  AND ("Comes down" is empty or in the future)
So rotation = set the dates; this script does the taking-down.

Safety: refuses to write a suspiciously shrunken catalogue (guards against
a half-failed fetch nuking the site). Override consciously with FORCE=1.
"""

import json, os, sys, urllib.request, urllib.parse
from datetime import date

BASE   = "appE8PGfkXDMuZCXe"
TABLE  = "tblLVyDTlgB3E8sQp"
TOKEN  = os.environ.get("AIRTABLE_PAT", "")
OUT    = "paintings.json"

# ---- public whitelist: field id -> site key ------------------------------
F_PUBLISH   = "flduUIlOtmw04hwwL"
F_LIVEFROM  = "fldwQJyU12bFcazC3"
F_COMESDOWN = "fld4tapdjfHnf2fAZ"
WHITELIST = {
    "fldaFiuL9FO21uLI0": "id",          # slug
    "fldUwsWcBNFRiOm80": "title",
    "fldsi0m3fLzHXERwF": "img",
    "fldAMf6fRUa1jSCsH": "price",       # display string e.g. "£2,760" / "Sold"
    "fldWPm0R5SD7mztnp": "size",
    "fldaDJkmLc2ygxYyJ": "lat",
    "fldM6DKhwMMNKb6lK": "lng",
    "fldIN7uBzbDvDHhVJ": "collection",
    "fldapZPALBU4fJiri": "prints",
    "fld71xX2bZRf2Duoe": "category",
    "fldK2MfHmSOcuL5Cd": "sold",        # checkbox -> true
}
CARRY_FORWARD = {"datePainted"}         # site-only keys we preserve per id

def fetch_all():
    records, offset = [], None
    while True:
        q = {"returnFieldsByFieldId": "true", "pageSize": "100"}
        if offset: q["offset"] = offset
        req = urllib.request.Request(
            f"https://api.airtable.com/v0/{BASE}/{TABLE}?{urllib.parse.urlencode(q)}",
            headers={"Authorization": f"Bearer {TOKEN}"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        records += data.get("records", [])
        offset = data.get("offset")
        if not offset:
            return records

def is_live(f):
    if not f.get(F_PUBLISH): return False
    today = date.today().isoformat()
    lf, cd = f.get(F_LIVEFROM), f.get(F_COMESDOWN)
    if lf and lf > today:  return False
    if cd and cd <= today: return False
    return True

def project(f):
    out = {}
    for fid, key in WHITELIST.items():
        v = f.get(fid)
        if v in (None, "", False): continue
        out[key] = v
    return out

def main():
    if not TOKEN:
        sys.exit("AIRTABLE_PAT not set")

    old, old_order = [], {}
    if os.path.exists(OUT):
        old = json.load(open(OUT))
        old_order = {p["id"]: i for i, p in enumerate(old)}
    old_by_id = {p["id"]: p for p in old}

    live = [project(r["fields"]) for r in fetch_all() if is_live(r["fields"])]
    live = [p for p in live if p.get("id") and p.get("title") and p.get("img")]

    # carry forward site-only keys (e.g. datePainted) for ids already live
    for p in live:
        prev = old_by_id.get(p["id"])
        if prev:
            for k in CARRY_FORWARD:
                if k in prev: p[k] = prev[k]

    # order: newest additions first, existing pieces keep their relative order
    known = [p for p in live if p["id"] in old_order]
    fresh = [p for p in live if p["id"] not in old_order]
    known.sort(key=lambda p: old_order[p["id"]])
    result = fresh + known

    if old and len(result) < max(20, int(0.6 * len(old))) and os.environ.get("FORCE") != "1":
        sys.exit(f"Refusing: projection has {len(result)} paintings vs {len(old)} live now. "
                 f"If this shrink is intentional, rerun with FORCE=1.")

    new_text = json.dumps(result, ensure_ascii=False, indent=1) + "\n"
    if os.path.exists(OUT) and open(OUT).read() == new_text:
        print(f"No change — {len(result)} live."); return
    open(OUT, "w").write(new_text)
    print(f"Wrote {OUT}: {len(result)} live "
          f"({len(fresh)} new, {len(old) - len(known)} came down).")

if __name__ == "__main__":
    main()
