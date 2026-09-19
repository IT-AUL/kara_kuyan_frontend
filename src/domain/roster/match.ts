export type RosterEntry = { id: string; name: string };

/** Uppercase letters only: drops spaces, dots and punctuation so a printed name matches a roster name. */
export function normalizeName(text: string): string {
  return Array.from(text.toUpperCase())
    .filter((ch) => ch.toLowerCase() !== ch.toUpperCase())
    .join('');
}

function lcsLength(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1]);
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Best roster match for the recognised name field, or null when nothing is clearly best.
 * The field often picks up stray letters from empty cells (glare, screen moiré) but rarely loses real
 * ones, so a roster name matches when (almost) all its letters appear in order in the reading, and the
 * reading is not mostly noise. The teacher can always override ("Изменить ученика").
 */
export function matchStudent<T extends RosterEntry>(
  nameText: string,
  roster: readonly T[],
  minCoverage = 0.85,
  minPurity = 0.4,
  minMargin = 0.1,
): T | null {
  const target = normalizeName(nameText);
  if (target.length < 3) return null;
  const scored = roster
    .map((entry) => {
      const candidate = normalizeName(entry.name);
      const lcs = lcsLength(target, candidate);
      return { entry, coverage: lcs / candidate.length, purity: lcs / target.length };
    })
    .filter((s) => s.coverage >= minCoverage && s.purity >= minPurity)
    .sort((x, y) => y.coverage - x.coverage || y.purity - x.purity);
  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].coverage - scored[1].coverage < minMargin && scored[0].purity - scored[1].purity < minMargin) {
    return null;
  }
  return scored[0].entry;
}
