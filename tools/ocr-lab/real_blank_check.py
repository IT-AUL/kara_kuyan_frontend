"""Run the reference pipeline on the backend's real blank PDF (GET /api/v1/assignments/TAT-2026-Q1/blank.pdf).
An empty sheet must read as empty; any non-empty read is a false positive."""
import pathlib
import e2e_desktop as e

pdf = pathlib.Path(__file__).parents[1] / "sheet-gen/out/live_blank_TAT-2026-Q1_var1.pdf"
img = e.rasterize(pdf, 300)
cells_total = 0
for label, seed in (("clean 300dpi", None), *((f"degraded seed {s}", s) for s in range(1, 7))):
    im = img if seed is None else e.degrade(img, seed)
    rect = e.rectify(im)
    if rect is None:
        print(f"{label}: rectify FAILED"); continue
    name, rows = e.extract_cells(rect)
    name_read = "".join(e.read(rect, name))
    row_reads = ["".join(e.read(rect, b)) for _, b in rows]
    n = len(name) + sum(len(b) for _, b in rows)
    fp = len(name_read) + sum(len(r) for r in row_reads)
    print(f"{label}: rows {len(rows)} x cells {[len(b) for _, b in rows]}, QR {e.qr_text(rect)}, "
          f"false non-empty cells {fp}/{n} (name '{name_read}', rows {row_reads})")
