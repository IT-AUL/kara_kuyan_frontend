import type { SheetEvidence } from '../domain/ocr/evidence';

/** Normalized 0..1 image coordinates for the alignment overlay. Coordinates only, no pixels. */
export type NormalizedPoint = { x: number; y: number };

export type AlignmentPhase = 'searching' | 'aligning' | 'locked' | 'capturing' | 'processing';

export type AlignmentHint =
  | 'move-closer'
  | 'move-away'
  | 'hold-steady'
  | 'glare'
  | 'too-dark'
  | 'blurry'
  | 'tilted';

export type AlignmentState = {
  phase: AlignmentPhase;
  /** Corner markers currently detected, 0..4. */
  markersFound: number;
  hints: readonly AlignmentHint[];
  /** Detected sheet corners for the overlay, `null` until located. */
  corners: readonly NormalizedPoint[] | null;
};

/**
 * Structure of the printed sheet, taken from the offline bundle.
 * Contains no expected answers and no backend concepts.
 * Answer-row and cell coordinates are intentionally absent: the contract does not
 * define them yet (see `docs/contracts/contract-gaps.md`).
 */
export type SheetTemplate = {
  format: 'A4';
  cellSizeMm: { width: number; height: number };
  questions: readonly { questionNumber: number; markerId: number; cellCount: number }[];
};

export type OcrSessionConfig = {
  template: SheetTemplate;
};

export class SheetPickCancelled extends Error {
  constructor() {
    super('sheet pick cancelled');
  }
}

export type Unsubscribe = () => void;

export interface OcrSession {
  /** Live alignment feedback while the teacher frames the sheet. */
  onAlignment(listener: (state: AlignmentState) => void): Unsubscribe;
  /**
   * Waits for a stable, well-framed sheet, processes it in native memory,
   * and resolves with numbers and text only. Rejects if the session is closed.
   */
  captureSheet(): Promise<SheetEvidence>;
  /**
   * Lets the teacher pick an existing image of a sheet and reads it the same way. The file is opened and
   * released inside the native module (ADR 0007). Rejects with `SheetPickCancelled` when nothing is chosen.
   */
  readSheetFromDevice(): Promise<SheetEvidence>;
  /** Releases the camera and every native buffer. Safe to call more than once. */
  close(): Promise<void>;
}

/**
 * Boundary to the native OCR module. Camera frames never cross it (ADR 0003):
 * implementations return structured evidence only, and know nothing about
 * backends, URLs, auth or sync.
 */
export interface OcrEngine {
  /** Resolves true when camera access is granted (asks the user if needed). */
  ensureCameraPermission(): Promise<boolean>;
  openSession(config: OcrSessionConfig): Promise<OcrSession>;
}
