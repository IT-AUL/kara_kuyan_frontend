/** Russian plural form: `pluralRu(3, 'ученик', 'ученика', 'учеников')` → «ученика». */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export const studentsText = (n: number): string => `${n} ${pluralRu(n, 'ученик', 'ученика', 'учеников')}`;
