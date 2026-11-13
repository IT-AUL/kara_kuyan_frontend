// Pure domain parser, sanitizer & version/expiry filter for Remote Announcements (ADR 0010).
// Security invariant: remote payloads are untrusted data — validate shapes, bound lengths,
// and allow only internal `/...` routes or `https://` external URLs.

import type {
  FeedIconKind,
  FeedItem,
  FeedKind,
  FeedTone,
  NotificationCategoryId,
  NotificationChannelId,
} from './feed';

const ID_PATTERN = /^[a-zA-Z0-9._:-]{3,80}$/;
const INTERNAL_ROUTE_PATTERN = /^\/[a-zA-Z0-9/_?=&.%-]{0,240}$/;
const HTTPS_URL_PATTERN = /^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?(?:\/[^\s<>"]*)?$/i;

const VALID_KINDS = new Set<FeedKind>(['event', 'insight', 'news', 'tip']);
const VALID_CHANNELS = new Set<NotificationChannelId>([
  'check_sync',
  'class_insights',
  'updates_news',
  'teacher_tips',
]);
const VALID_TONES = new Set<FeedTone>(['ok', 'warn', 'err', 'info']);
const VALID_ICONS = new Set<FeedIconKind>([
  'check',
  'sync',
  'warning',
  'insight',
  'release',
  'tip',
  'news',
]);
const VALID_CATEGORIES = new Set<NotificationCategoryId>([
  'pack_complete',
  'sync_failed',
  'topic_insight',
  'release_update',
  'remote_announcement',
]);

const DEFAULT_EPOCH_MS = Date.UTC(2026, 10, 13, 0, 0, 0);
const MAX_ITEMS = 50;

export type ParseRemoteOptions = {
  currentVersion: string;
  nowMs: number;
};

/** True when a sanitized navigation target is an external `https://` URL rather than an in-app Expo route. */
export function isExternalHttpsUrl(target: string | undefined): boolean {
  return typeof target === 'string' && /^https:\/\//i.test(target);
}

/**
 * Allows only:
 * 1. Internal app routes starting with a single `/` (never protocol-relative `//`), or
 * 2. External `https://` URLs.
 * Everything else (`http://`, `javascript:`, `data:`, `file:`, `intent:`) is rejected (`undefined`).
 */
export function sanitizeNavigationTarget(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return undefined;
  if (trimmed.startsWith('//')) return undefined;
  if (INTERNAL_ROUTE_PATTERN.test(trimmed)) return trimmed;
  if (HTTPS_URL_PATTERN.test(trimmed)) return trimmed;
  return undefined;
}

function parseSemverTuple(version: string): readonly [number, number, number] | null {
  const cleaned = version.trim().replace(/^v/i, '').split('-')[0] ?? '';
  const parts = cleaned.split('.');
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : Number.NaN));
  if (nums.some((n) => Number.isNaN(n))) return null;
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
}

export function compareSemver(a: string, b: string): number | null {
  const ta = parseSemverTuple(a);
  const tb = parseSemverTuple(b);
  if (!ta || !tb) return null;
  for (let i = 0; i < 3; i += 1) {
    const diff = (ta[i] ?? 0) - (tb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function matchesAppVersion(
  currentVersion: string,
  minAppVersion?: unknown,
  maxAppVersion?: unknown,
): boolean {
  if (typeof minAppVersion === 'string' && minAppVersion.trim() !== '') {
    const cmp = compareSemver(currentVersion, minAppVersion);
    if (cmp === null || cmp < 0) return false;
  }
  if (typeof maxAppVersion === 'string' && maxAppVersion.trim() !== '') {
    const cmp = compareSemver(currentVersion, maxAppVersion);
    if (cmp === null || cmp > 0) return false;
  }
  return true;
}

function boundedText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1).trimEnd()}…` : trimmed;
}

function defaultChannelFor(kind: FeedKind): NotificationChannelId {
  switch (kind) {
    case 'tip':
      return 'teacher_tips';
    case 'insight':
      return 'class_insights';
    case 'event':
    case 'news':
      return 'updates_news';
  }
}

function defaultIconFor(kind: FeedKind): FeedIconKind {
  switch (kind) {
    case 'event':
      return 'check';
    case 'insight':
      return 'insight';
    case 'tip':
      return 'tip';
    case 'news':
      return 'news';
  }
}

function defaultBadgeFor(kind: FeedKind): string {
  switch (kind) {
    case 'event':
      return 'Событие';
    case 'insight':
      return 'Подсказка';
    case 'tip':
      return 'Совет';
    case 'news':
      return 'Новость';
  }
}

function parseTimestampMs(raw: unknown, fallbackMs: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Date.parse(raw.trim());
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallbackMs;
}

function parseSingleItem(raw: unknown, opts: ParseRemoteOptions, index: number): FeedItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const rec = raw as Record<string, unknown>;

  const rawId = typeof rec.id === 'string' ? rec.id.trim() : '';
  if (!ID_PATTERN.test(rawId)) return null;
  // Prevent remote feed items from colliding with derived local state keys (`event:*`, `insight:*`).
  const id = rawId.startsWith('event:') || rawId.startsWith('insight:') ? `remote:${rawId}` : rawId;

  const title = boundedText(rec.title, 140);
  const summary = boundedText(rec.summary, 280);
  if (!title || !summary) return null;

  if (!matchesAppVersion(opts.currentVersion, rec.minAppVersion, rec.maxAppVersion)) {
    return null;
  }

  if (rec.expiresAt !== undefined && rec.expiresAt !== null && rec.expiresAt !== '') {
    const expMs =
      typeof rec.expiresAt === 'string' ? Date.parse(rec.expiresAt.trim()) : Number.NaN;
    if (Number.isNaN(expMs) || opts.nowMs > expMs) {
      return null;
    }
  }

  const kind: FeedKind =
    typeof rec.kind === 'string' && VALID_KINDS.has(rec.kind as FeedKind)
      ? (rec.kind as FeedKind)
      : 'news';

  const channelId: NotificationChannelId =
    typeof rec.channelId === 'string' && VALID_CHANNELS.has(rec.channelId as NotificationChannelId)
      ? (rec.channelId as NotificationChannelId)
      : defaultChannelFor(kind);

  const tone: FeedTone =
    typeof rec.tone === 'string' && VALID_TONES.has(rec.tone as FeedTone)
      ? (rec.tone as FeedTone)
      : 'info';

  const icon: FeedIconKind =
    typeof rec.icon === 'string' && VALID_ICONS.has(rec.icon as FeedIconKind)
      ? (rec.icon as FeedIconKind)
      : defaultIconFor(kind);

  const badge = boundedText(rec.badge, 44) ?? defaultBadgeFor(kind);
  const body = boundedText(rec.body, 4_000) ?? summary;
  const createdAt = parseTimestampMs(rec.publishedAt ?? rec.createdAt, DEFAULT_EPOCH_MS - index);

  const primaryTarget = sanitizeNavigationTarget(rec.route ?? rec.externalUrl);
  const actionLabel = primaryTarget
    ? (boundedText(rec.actionLabel, 40) ??
      (isExternalHttpsUrl(primaryTarget) ? 'Перейти по ссылке' : 'Открыть'))
    : undefined;

  const secondaryTarget = sanitizeNavigationTarget(rec.secondaryRoute ?? rec.secondaryExternalUrl);
  const secondaryActionLabel = secondaryTarget
    ? (boundedText(rec.secondaryActionLabel, 40) ?? 'Подробнее')
    : undefined;

  const systemNotify = rec.systemNotify === true;
  const explicitCategory =
    typeof rec.categoryId === 'string' && VALID_CATEGORIES.has(rec.categoryId as NotificationCategoryId)
      ? (rec.categoryId as NotificationCategoryId)
      : undefined;
  const categoryId: NotificationCategoryId | undefined =
    explicitCategory ?? (systemNotify && primaryTarget ? 'remote_announcement' : undefined);

  return {
    id,
    kind,
    channelId,
    categoryId,
    icon,
    tone,
    badge,
    title,
    summary,
    body,
    createdAt,
    pinned: rec.pinned === true,
    systemNotify,
    actionLabel,
    route: primaryTarget,
    secondaryActionLabel,
    secondaryRoute: secondaryTarget,
  };
}

/**
 * Parses & sanitizes an untrusted remote JSON payload (`{ items: [...] }` or `[...]`),
 * deduplicating by `id` (first wins) and capping at 50 items.
 */
export function parseRemoteAnnouncementsPayload(
  raw: unknown,
  opts: ParseRemoteOptions,
): readonly FeedItem[] {
  let rawList: unknown[] | null = null;
  if (Array.isArray(raw)) {
    rawList = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    const candidate = (raw as Record<string, unknown>).items;
    if (Array.isArray(candidate)) rawList = candidate;
  }
  if (!rawList) return [];

  const seen = new Set<string>();
  const out: FeedItem[] = [];
  for (let i = 0; i < rawList.length && out.length < MAX_ITEMS; i += 1) {
    const parsed = parseSingleItem(rawList[i], opts, i);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    out.push(parsed);
  }
  return out;
}

/** Merges multiple remote announcement lists (e.g. backend API + CDN fallback), deduplicating by `id`. */
export function mergeAnnouncementLists(
  ...lists: readonly (readonly FeedItem[])[]
): readonly FeedItem[] {
  const seen = new Set<string>();
  const merged: FeedItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= MAX_ITEMS) return merged;
    }
  }
  return merged;
}
