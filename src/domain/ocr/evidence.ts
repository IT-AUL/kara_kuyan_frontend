// Structured OCR evidence. Carries numbers and text only — never pixels (ADR 0003).

export type TopCandidateEvidence = {
  char: string;
  /** Probability in [0, 1]. */
  confidence: number;
};

export type CellEvidence = {
  index: number;
  /** 1-based cell index emitted by C++ `tatar_ocr::ScannedCell`. */
  cellIdx?: number;
  /** True when the ink rule found no handwriting. */
  isEmpty: boolean;
  /** Ink pixels found in the cell (0 when empty); lets the decision ignore specks where a cell should stay blank. */
  inkPixels?: number;
  /** Softmax over `SheetEvidence.alphabet`, same order; empty array when `isEmpty`. */
  probabilities: readonly number[];
  /** Canonical top-1 character from C++ `NativeBlankScanner` (Stage-6 diacritic guarded). */
  char?: string;
  /** Canonical top-1 confidence in [0, 1] from C++ `NativeBlankScanner`. */
  confidence?: number;
  /** Canonical ordered Top-3 hypotheses from C++ `NativeBlankScanner` (preserves Stage-6 diacritic guard order). */
  top3?: readonly TopCandidateEvidence[];
  /** Cell bounding box `[x, y, w, h]` on the rectified 2100x2970 canvas. */
  bbox?: readonly number[];
};

export type QuestionEvidence = {
  questionNumber: number;
  markerId: number | null;
  text?: string;
  cells: readonly CellEvidence[];
};

export type BlankStatsEvidence = {
  totalLetters: number;
  avgConfidence: number;
  questionsCount: number;
};

export type SheetEvidence = {
  /** Class order as reported by `pipeline_spec.json` / manifest; the domain never hardcodes it. */
  alphabet: readonly string[];
  /** SHA-256 of the model artifact that produced the predictions. */
  modelSha256: string;
  /** Raw decoded QR text; parsed by the application layer, `null` if none decoded. */
  qrPayload: string | null;
  /** Top-1 text of the student-name field (uppercase, trimmed); empty when unfilled. */
  studentNameText: string;
  /** Per-cell breakdown of the student-name field from C++ `NativeBlankScanner`. */
  studentNameCells?: readonly CellEvidence[];
  /** How the sheet was rectified (`ArUco 4-Point Geometry`, `ArUco Similarity Transform (...)`, `Document Contour Fallback`, etc.). */
  method: string;
  /** Summary statistics from C++ `BlankResult.stats`. */
  stats?: BlankStatsEvidence;
  questions: readonly QuestionEvidence[];
  /** Debug timings per pipeline stage, milliseconds. */
  stageTimingsMs: Readonly<Record<string, number>>;
};
