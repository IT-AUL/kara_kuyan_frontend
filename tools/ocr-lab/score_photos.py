"""Score photos of the calibration sheets (tools/sheet-gen/gen_calibration.py) against the answer key.

  python score_photos.py [photos_dir]        # default: tools/ocr-lab/fixtures-private/photos (git-ignored)
  python score_photos.py --selftest          # synthetic degraded photos, validates this script

The sheet is identified from its QR (`TAT-CAL-NN`) or, if that fails, from a two-digit number in the file
name. Reports: per-cell accuracy, per-letter table, empty-cell false positives, confidence calibration,
and how the proposed decision thresholds behave (auto-accept / review / false error / false accept).
"""
import collections, json, pathlib, re, sys
import cv2, numpy as np
import e2e_desktop as e
from preprocess import ALPHABET
from preprocess_server import preprocess_cell_server

ROOT = pathlib.Path(__file__).parent
KEY = json.loads((ROOT.parent / "sheet-gen/fixtures/calibration_bundles.json").read_text())["bundles"]
BY_TID = {b["assignment_id"]: b for b in KEY}
PAIRS = {("Ә","А"),("Ң","Н"),("Ө","О"),("Ү","У"),("Җ","Ж"),("Һ","Х")}
PAIRS |= {(b, a) for a, b in PAIRS}
P_ACC, M_ACC, M_CONF, P_REJ = 0.8, 0.3, 0.5, 0.8   # proposed thresholds (src/domain/ocr/decision.ts)


def probs_of(rect, box):
    x, y, w, h = box
    inp, t, empty = preprocess_cell_server(cv2.cvtColor(rect[y:y+h, x:x+w], cv2.COLOR_BGR2GRAY), tolerant_lines=True)  # same as the app
    if empty: return None
    lg = e.sess.run(None, {"input": t})[0][0]; p = np.exp(lg - lg.max()); return p / p.sum()


def tid_of(rect, path):
    q = e.qr_text(rect)
    try: return json.loads(q)["tid"]
    except Exception:
        m = re.search(r"(\d{2})", path.stem); return f"TAT-CAL-{m.group(1)}" if m else None


def score_image(path, img, rec):
    rect = e.rectify(img)
    if rect is None: rec["fail"].append((path.name, "rectify failed (need all 4 corner markers)")); return
    tid = tid_of(rect, path)
    if tid not in BY_TID: rec["fail"].append((path.name, f"unknown sheet {tid!r}")); return
    bq = {q["marker_id"]: q for q in BY_TID[tid]["variants"][0]["questions"]}
    name, rows = e.extract_cells(rect)
    rec["sheets"].append(f"{path.name} -> {tid}")
    rec["name_fp"] += sum(probs_of(rect, b) is not None for b in name); rec["name_n"] += len(name)
    for mid, boxes in rows:
        q = bq.get(mid)
        if q is None: continue
        cells = q["expected_cells"]
        if len(boxes) != len(cells): rec["fail"].append((path.name, f"marker {mid}: {len(boxes)} cells, expected {len(cells)}"))
        for c, box in zip(cells, boxes):
            p = probs_of(rect, box); ch = c["char"]
            if ch == " ":
                rec["blank_n"] += 1; rec["blank_fp"] += p is not None; continue
            if p is None: rec["cells"].append(dict(exp=ch, empty=True)); continue
            order = np.argsort(p)[::-1]; ei = ALPHABET.index(ch)
            other = max(p[i] for i in range(39) if i != ei)
            rec["cells"].append(dict(exp=ch, empty=False, top=[ALPHABET[i] for i in order[:3]], p1=float(p[order[0]]),
                                     pe=float(p[ei]), margin=float(p[ei] - other), probs=p))


def verdict(exp, probs):
    ei = ALPHABET.index(exp); pe = probs[ei]; alt = max((i for i in range(39) if i != ei), key=lambda i: probs[i])
    need = M_CONF if (exp, ALPHABET[alt]) in PAIRS else M_ACC
    if pe >= P_ACC and pe - probs[alt] >= need: return "match"
    if probs[alt] > pe and probs[alt] >= P_REJ: return "mismatch"
    return "uncertain"


def report(rec, out):
    L = [c for c in rec["cells"]]; ne = [c for c in L if not c["empty"]]; N = len(L)
    L1 = [f"# Calibration report", "", f"Sheets scored: {len(rec['sheets'])}; letter cells: {N}; empty (missed) letters: {N - len(ne)}", ""]
    for s in rec["sheets"]: L1.append(f"- {s}")
    for f in rec["fail"]: L1.append(f"- FAILED {f[0]}: {f[1]}")
    top1 = sum(c["top"][0] == c["exp"] for c in ne); top3 = sum(c["exp"] in c["top"] for c in ne)
    L1 += ["", "## Accuracy", f"- top-1 correct: {top1}/{N} = {100*top1/max(N,1):.1f}% (of read cells {100*top1/max(len(ne),1):.1f}%)",
           f"- expected letter within top-3: {top3}/{N} = {100*top3/max(N,1):.1f}%",
           f"- letters read as empty (missed): {N-len(ne)}",
           f"- trailing (must-be-empty) cells read as non-empty: {rec['blank_fp']}/{rec['blank_n']}",
           f"- name-field (empty) cells read as non-empty: {rec['name_fp']}/{rec['name_n']}"]
    v = collections.Counter(verdict(c["exp"], c["probs"]) if not c["empty"] else "blank" for c in L)
    L1 += ["", "## Proposed thresholds (p>=0.8, lead>=0.3, 0.5 for confusable pairs) with the TRUE letter as expected",
           f"- auto-accepted: {v['match']} ({100*v['match']/max(N,1):.1f}%)  |  sent to review: {v['uncertain']+v['blank']} ({100*(v['uncertain']+v['blank'])/max(N,1):.1f}%)"
           f"  |  **false error (correct letter marked wrong): {v['mismatch']} ({100*v['mismatch']/max(N,1):.1f}%)**"]
    fa = tot = 0
    for c in ne:                                   # simulate a student who wrote a different letter than expected
        for alt in ALPHABET:
            if alt == c["exp"]: continue
            tot += 1; fa += verdict(alt, c["probs"]) == "match"
    conf = [(a, b) for a in ALPHABET for b in ALPHABET if (a, b) in PAIRS]
    fa2 = sum(verdict(b, c["probs"]) == "match" for c in ne for (a, b) in conf if a == c["exp"]); tot2 = sum(1 for c in ne for (a, b) in conf if a == c["exp"])
    L1 += [f"- **false accept** (student wrote letter X, teacher key says Y, app says correct): {fa}/{tot} over all wrong Y ({100*fa/max(tot,1):.3f}%); confusable pairs only: {fa2}/{tot2} ({100*fa2/max(tot2,1):.2f}%)"]
    L1 += ["", "## Confidence vs correctness (top-1 probability p1)", "| p1 >= | cells | share | accuracy of those |", "|---|---|---|---|"]
    for t in (0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99):
        s = [c for c in ne if c["p1"] >= t]; L1.append(f"| {t} | {len(s)} | {100*len(s)/max(N,1):.0f}% | {100*sum(c['top'][0]==c['exp'] for c in s)/max(len(s),1):.1f}% |")
    L1 += ["", "## Threshold sweep for auto-accept (lead>=0.3): coverage of true letters and wrong-letter acceptance", "| p >= | auto-accept | false accept (all wrong Y) |", "|---|---|---|"]
    for t in (0.5, 0.6, 0.7, 0.8, 0.9):
        acc = sum(c["pe"] >= t and c["margin"] >= 0.3 for c in ne)
        fa_t = sum(c2["probs"][ALPHABET.index(alt)] >= t and c2["probs"][ALPHABET.index(alt)] - max(c2["probs"][i] for i in range(39) if i != ALPHABET.index(alt)) >= 0.3
                   for c2 in ne for alt in ALPHABET if alt != c2["exp"])
        L1.append(f"| {t} | {100*acc/max(N,1):.1f}% | {fa_t}/{tot} = {100*fa_t/max(tot,1):.3f}% |")
    per = collections.defaultdict(lambda: [0, 0, collections.Counter()])
    for c in L:
        r = per[c["exp"]]; r[0] += 1
        if not c["empty"]:
            r[1] += c["top"][0] == c["exp"]
            if c["top"][0] != c["exp"]: r[2][c["top"][0]] += 1
    L1 += ["", "## Per letter", "| letter | n | top-1 | most common misread |", "|---|---|---|---|"]
    for ch in ALPHABET:
        if ch in per: n, ok, cf = per[ch]; L1.append(f"| {ch} | {n} | {ok}/{n} | {', '.join(f'{a}×{b}' for a, b in cf.most_common(2)) or '—'} |")
    out.write_text("\n".join(L1)); print("\n".join(L1[:22])); print("... full report:", out)


def main():
    rec = dict(cells=[], sheets=[], fail=[], name_fp=0, name_n=0, blank_fp=0, blank_n=0)
    if "--selftest" in sys.argv:
        for pdf in sorted((ROOT.parent / "sheet-gen/out/calibration").glob("sheet_cal_*_synthetic.pdf"))[:4]:
            for seed in (1, 2):
                score_image(pathlib.Path(f"{pdf.stem.replace('_synthetic','')}_s{seed}.jpg"), e.degrade(e.rasterize(pdf, 300), seed), rec)
    else:
        d = pathlib.Path(next((a for a in sys.argv[1:] if not a.startswith("--")), ROOT / "fixtures-private/photos"))
        for p in sorted(d.glob("*")):
            if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".heic"): score_image(p, cv2.imread(str(p)), rec)
    if not rec["cells"]: print("nothing scored", rec["fail"]); return
    report(rec, ROOT / "out" / ("calibration_selftest.md" if "--selftest" in sys.argv else "calibration_report.md"))


if __name__ == "__main__":
    main()
