// Offline bundle shape as the domain sees it (source: backend offline-bundle, mapped by an adapter).

export type BundleCell = { index: number; char: string };

export type BundleQuestion = {
  questionNumber: number;
  markerId: number;
  prompt: string;
  topicTag: string;
  /** Human-readable topic (Tatar); absent in bundles cached before it was parsed. */
  topicName?: string;
  expectedAnswer: string;
  expectedCells: readonly BundleCell[];
};

export type BundleVariant = {
  variantId: number;
  questions: readonly BundleQuestion[];
};

export type OfflineBundle = {
  assignmentId: string;
  title: string;
  variants: readonly BundleVariant[];
};

/** Parses the QR text `{"tid":…,"var":…}`; returns null when it is not the expected JSON. */
export type QrSignature = { assignmentId: string; variant: number; questionCount: number | null };

export function parseQrSignature(payload: string | null): QrSignature | null {
  if (!payload) return null;
  try {
    const json = JSON.parse(payload) as { tid?: unknown; var?: unknown; n_q?: unknown };
    if (typeof json.tid !== 'string' || typeof json.var !== 'number') return null;
    return {
      assignmentId: json.tid,
      variant: json.var,
      questionCount: typeof json.n_q === 'number' ? json.n_q : null,
    };
  } catch {
    return null;
  }
}
