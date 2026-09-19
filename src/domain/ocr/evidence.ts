// Structured OCR evidence. Carries numbers and text only — never pixels (ADR 0003).

export type CellEvidence = {
  index: number;
  /** True when the ink rule found no handwriting (the authors' rule: total ink < 30 px). */
  isEmpty: boolean;
  /** Ink pixels found in the cell (0 when empty); lets the decision ignore specks where a cell should stay blank. */
  inkPixels?: number;
  /** Softmax over `SheetEvidence.alphabet`, same order; empty array when `isEmpty`. */
  probabilities: readonly number[];
};

export type QuestionEvidence = {
  questionNumber: number;
  markerId: number | null;
  cells: readonly CellEvidence[];
};

export type SheetEvidence = {
  /** Class order as reported by the model manifest; the domain never hardcodes it. */
  alphabet: readonly string[];
  /** SHA-256 of the model artifact that produced the probabilities. */
  modelSha256: string;
  /** Raw decoded QR text; parsed by the application layer, `null` if none decoded. */
  qrPayload: string | null;
  /** Top-1 text of the student-name field (uppercase, no spaces); empty when unfilled. */
  studentNameText: string;
  /** How the sheet was rectified: `aruco-4-point` or `marker-homography`. */
  method: string;
  questions: readonly QuestionEvidence[];
  /** Debug timings per pipeline stage, milliseconds. */
  stageTimingsMs: Readonly<Record<string, number>>;
};
