import type { OfflineBundle } from '@/domain/scan/bundle';
import calibration from './calibration-bundles.fixture.json';
import fixture from './offline-bundle.fixture.json';

type ApiBundle = typeof fixture;

function toBundle(api: ApiBundle): OfflineBundle {
  return {
  assignmentId: api.assignment_id,
  title: api.title,
  variants: api.variants.map((v) => ({
    variantId: v.variant_id,
    questions: v.questions.map((q) => ({
      questionNumber: q.question_number,
      markerId: q.marker_id,
      prompt: q.prompt,
      topicTag: q.topic_tag,
      expectedAnswer: q.expected_answer,
      expectedCells: q.expected_cells.map((c) => ({ index: c.index, char: c.char })),
    })),
  })),
  };
}

/** Known assignments (stand-in for the offline bundle store; the live endpoint returned HTTP 500 — contract-gaps 21). */
export const demoBundles: readonly OfflineBundle[] = [
  toBundle(fixture),
  ...(calibration.bundles as unknown as ApiBundle[]).map(toBundle),
];
export const demoBundle = demoBundles[0];
