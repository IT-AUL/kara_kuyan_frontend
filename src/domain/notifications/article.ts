// Pure editorial article parser & metadata formatter for Notification Detail view (ADR 0010).
// Supports plain text as well as lightweight Markdown-style blocks (headings, paragraphs,
// bullet lists, numbered steps, and `>` callout notes) with zero HTML/XSS surface.

export type ArticleBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: readonly string[] }
  | { kind: 'steps'; items: readonly string[] }
  | { kind: 'callout'; text: string };

export type ParsedArticle = {
  lead: string | null;
  blocks: readonly ArticleBlock[];
  readTimeLabel: string;
};

const HEADING_RE = /^#{1,3}\s+(.+)$/;
const BULLET_RE = /^(?:[-•*])\s+(.+)$/;
const STEP_RE = /^\d+[.)]\s+(.+)$/;
const CALLOUT_RE = /^>\s*(.+)$/;

function splitIntoRawBlocks(source: string): readonly ArticleBlock[] {
  const normalized = source.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks = normalized.split(/\n{2,}/);
  const blocks: ArticleBlock[] = [];

  for (const rawChunk of chunks) {
    const lines = rawChunk
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    // Single-line heading (`### Как снимать без бликов`) or heading followed by content in same chunk
    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx]!;

      const headingMatch = HEADING_RE.exec(line);
      if (headingMatch?.[1]) {
        blocks.push({ kind: 'heading', text: headingMatch[1].trim() });
        idx += 1;
        continue;
      }

      if (BULLET_RE.test(line)) {
        const items: string[] = [];
        while (idx < lines.length) {
          const m = BULLET_RE.exec(lines[idx]!);
          if (!m?.[1]) break;
          items.push(m[1].trim());
          idx += 1;
        }
        if (items.length > 0) blocks.push({ kind: 'bullets', items });
        continue;
      }

      if (STEP_RE.test(line)) {
        const items: string[] = [];
        while (idx < lines.length) {
          const m = STEP_RE.exec(lines[idx]!);
          if (!m?.[1]) break;
          items.push(m[1].trim());
          idx += 1;
        }
        if (items.length > 0) blocks.push({ kind: 'steps', items });
        continue;
      }

      if (CALLOUT_RE.test(line)) {
        const parts: string[] = [];
        while (idx < lines.length) {
          const m = CALLOUT_RE.exec(lines[idx]!);
          if (!m?.[1]) break;
          parts.push(m[1].trim());
          idx += 1;
        }
        if (parts.length > 0) blocks.push({ kind: 'callout', text: parts.join(' ') });
        continue;
      }

      const paraParts: string[] = [];
      while (idx < lines.length) {
        const cur = lines[idx]!;
        if (
          HEADING_RE.test(cur) ||
          BULLET_RE.test(cur) ||
          STEP_RE.test(cur) ||
          CALLOUT_RE.test(cur)
        ) {
          break;
        }
        paraParts.push(cur);
        idx += 1;
      }
      if (paraParts.length > 0) {
        blocks.push({ kind: 'paragraph', text: paraParts.join(' ') });
      }
    }
  }

  return blocks;
}

export function estimateReadMinutes(...parts: readonly (string | undefined | null)[]): number {
  const words = parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 165));
}

export function parseArticleContent(summary: string, body: string): ParsedArticle {
  const cleanSummary = summary.trim();
  const cleanBody = body.trim();
  const hasDistinctBody = cleanBody.length > 0 && cleanBody !== cleanSummary;

  const blocks = splitIntoRawBlocks(hasDistinctBody ? cleanBody : cleanSummary);
  const mins = estimateReadMinutes(cleanSummary, hasDistinctBody ? cleanBody : null);

  return {
    lead: hasDistinctBody ? cleanSummary : null,
    blocks,
    readTimeLabel: `${mins} мин чтения`,
  };
}

const SHORT_MONTHS_RU = [
  'янв.',
  'февр.',
  'марта',
  'апр.',
  'мая',
  'июня',
  'июля',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
] as const;

const LONG_MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatFeedShortDate(createdAtMs: number, nowMs = Date.now()): string {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return '';
  const itemDay = startOfLocalDay(createdAtMs);
  const today = startOfLocalDay(nowMs);
  const diffDays = Math.round((today - itemDay) / 86_400_000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  const d = new Date(createdAtMs);
  return `${d.getDate()} ${SHORT_MONTHS_RU[d.getMonth()] ?? ''}`.trim();
}

export function formatArticleFullDate(createdAtMs: number): string {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return '';
  const d = new Date(createdAtMs);
  return `${d.getDate()} ${LONG_MONTHS_RU[d.getMonth()] ?? ''} ${d.getFullYear()}`.trim();
}
