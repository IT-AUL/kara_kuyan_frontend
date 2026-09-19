"""Generate 10 handwriting-calibration sheets (spike/flow evidence). Every sheet asks to copy 8 words, so
the expected answer of every cell is known. Letters are covered with a greedy pick that favours rare
letters. Outputs (tools/sheet-gen/out/calibration/, git-ignored) plus the answer key
(tools/sheet-gen/fixtures/calibration_bundles.json, committed)."""
import collections
import json
import pathlib

import pymupdf

import gen_sheet as g
from calibration_words import ALPHABET, DRILLS, POOL

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out" / "calibration"
SHEETS, PER = 10, 8

def pick():
    chosen, counts = [], collections.Counter()
    pool = list(dict.fromkeys(DRILLS + POOL))
    while len(chosen) < SHEETS * PER:
        best = max((w for w in pool if w not in chosen),
                   key=lambda w: sum(1.0 / (1 + counts[c]) for c in set(w)) / (len(w) ** 0.3))
        chosen.append(best); counts.update(best)
    return chosen, counts

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    words, counts = pick()
    order = sorted(words, key=len)  # spread short and long words over the sheets
    sheets = [[order[i * SHEETS + s] for i in range(PER)] for s in range(SHEETS)]
    bundles, layout = [], None
    merged = pymupdf.open()
    for n, ws in enumerate(sheets, 1):
        tid = f"TAT-CAL-{n:02d}"
        questions = [(f"Күчереп языгыз: {w} →", "copy", "Күчереп язу", w) for w in ws]
        layout, bundle = g.build_layout(questions, tid, f"Калибровка почерка №{n}")
        pdf = OUT / f"sheet_cal_{n:02d}.pdf"
        g.draw(pdf, layout, bundle, filled=False)
        g.draw(OUT / f"sheet_cal_{n:02d}_synthetic.pdf", layout, bundle, filled=True, wrong_answers={})
        merged.insert_pdf(pymupdf.open(str(pdf)))
        bundles.append(bundle)
    merged.save(str(OUT / "calibration_sheets.pdf"))
    (ROOT / "fixtures" / "calibration_bundles.json").write_text(
        json.dumps({"layout": layout, "bundles": bundles}, ensure_ascii=False, indent=1))
    print("letters:", sum(counts.values()), "| per letter min/median/max:", min(counts[c] for c in ALPHABET),
          sorted(counts[c] for c in ALPHABET)[19], max(counts.values()))
    print("rarest:", sorted(((c, counts[c]) for c in ALPHABET), key=lambda t: t[1])[:8])
    for n, ws in enumerate(sheets, 1): print(f"  sheet {n:02d}:", " ".join(ws))

if __name__ == "__main__":
    main()
