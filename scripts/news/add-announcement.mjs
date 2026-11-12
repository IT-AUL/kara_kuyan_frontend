#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEED_PATH = path.resolve(__dirname, '../../site/announcements.json');

const VALID_KINDS = new Set(['event', 'insight', 'news', 'tip']);
const VALID_CHANNELS = new Set(['check_sync', 'class_insights', 'updates_news', 'teacher_tips']);
const VALID_TONES = new Set(['ok', 'warn', 'err', 'info']);
const VALID_ICONS = new Set(['check', 'sync', 'warning', 'insight', 'release', 'tip', 'news']);

function printHelp() {
  console.log(`
Публикация уведомления / новости в site/announcements.json (Кара Куян)

Пример:
  pnpm run news:add -- \\
    --title "Олимпиада по татарскому языку" \\
    --summary "Подборка тренировочных карточек для 5–9 классов уже в конструкторе." \\
    --body "Добавлены новые задания на падежные аффиксы и сингармонизм." \\
    --kind event \\
    --tone ok \\
    --badge "Событие · РТ" \\
    --action-label "Собрать разминку" \\
    --route "/task-generate" \\
    --notify

Параметры:
  --id <slug>              Уникальный ключ (по умолчанию генерируется автоматически)
  --title <текст>          Заголовок (обязательно, до 140 симв.)
  --summary <текст>        Краткое описание для карточки и шторки Android (обязательно, до 280 симв.)
  --body <текст>           Полный текст при раскрытии карточки
  --kind <тип>             event | insight | news | tip (по умолчанию: news)
  --channel <канал>        check_sync | class_insights | updates_news | teacher_tips
  --tone <цвет>            ok | warn | err | info (по умолчанию: info)
  --icon <иконка>          check | sync | warning | insight | release | tip | news
  --badge <плашка>         Текст бейджа сверху карточки
  --route <маршрут/URL>    Внутренний экран (/scan, /analytics, /task-generate) или https://...
  --action-label <текст>   Подпись кнопки действия
  --expires-at <ISO>       Дата окончания показа (например, 2026-12-31T00:00:00Z)
  --min-version <semver>   Минимальная версия приложения (например, 0.4.1)
  --max-version <semver>   Максимальная версия приложения
  --pinned                 Закрепить карточку вверху ленты
  --notify                 Показать системное уведомление в шторке Android (systemNotify: true)
  --dry-run                Проверить и вывести JSON в консоль без записи файла
`);
}

function parseArgs(argv) {
  const out = { flags: new Set(), values: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out.flags.add(key);
    } else {
      out.values[key] = next;
      i += 1;
    }
  }
  return out;
}

function validateRoute(raw) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith('//')) {
    throw new Error(`Недопустимый маршрут "${trimmed}": используйте "/..." или "https://..."`);
  }
  if (/^\/[a-zA-Z0-9/_?=&.%-]{0,240}$/.test(trimmed)) return trimmed;
  if (/^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?(?:\/[^\s<>"]*)?$/i.test(trimmed)) return trimmed;
  throw new Error(`Недопустимый маршрут/URL "${trimmed}": разрешены только "/..." и "https://..."`);
}

const args = parseArgs(process.argv.slice(2));
if (args.flags.has('help') || args.flags.has('h')) {
  printHelp();
  process.exit(0);
}

const title = (args.values.title ?? '').trim();
const summary = (args.values.summary ?? '').trim();
if (!title || !summary) {
  console.error('Ошибка: укажите обязательные параметры --title и --summary (см. --help).');
  process.exit(1);
}

const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const datePrefix = nowIso.slice(0, 10);
const autoId = `${datePrefix}-${Math.random().toString(36).slice(2, 8)}`;
const id = (args.values.id ?? autoId).trim();
if (!/^[a-zA-Z0-9._:-]{3,80}$/.test(id)) {
  console.error(`Ошибка: некорректный --id "${id}" (разрешены латиница, цифры и . _ : -).`);
  process.exit(1);
}

const kind = args.values.kind ?? 'news';
if (!VALID_KINDS.has(kind)) {
  console.error(`Ошибка: --kind должен быть одним из: ${[...VALID_KINDS].join(', ')}`);
  process.exit(1);
}

const defaultChannel =
  kind === 'tip' ? 'teacher_tips' : kind === 'insight' ? 'class_insights' : 'updates_news';
const channelId = args.values.channel ?? defaultChannel;
if (!VALID_CHANNELS.has(channelId)) {
  console.error(`Ошибка: --channel должен быть одним из: ${[...VALID_CHANNELS].join(', ')}`);
  process.exit(1);
}

const tone = args.values.tone ?? (kind === 'event' ? 'ok' : 'info');
if (!VALID_TONES.has(tone)) {
  console.error(`Ошибка: --tone должен быть одним из: ${[...VALID_TONES].join(', ')}`);
  process.exit(1);
}

const defaultIcon =
  kind === 'event' ? 'check' : kind === 'tip' ? 'tip' : kind === 'insight' ? 'insight' : 'news';
const icon = args.values.icon ?? defaultIcon;
if (!VALID_ICONS.has(icon)) {
  console.error(`Ошибка: --icon должен быть одним из: ${[...VALID_ICONS].join(', ')}`);
  process.exit(1);
}

const route = validateRoute(args.values.route);
const secondaryRoute = validateRoute(args.values['secondary-route']);

const item = {
  id,
  kind,
  channelId,
  tone,
  icon,
  badge: (args.values.badge ?? (kind === 'event' ? 'Событие' : kind === 'tip' ? 'Совет' : 'Новость')).trim(),
  title,
  summary,
  ...(args.values.body ? { body: args.values.body.trim() } : {}),
  publishedAt: nowIso,
  ...(args.values['expires-at'] ? { expiresAt: args.values['expires-at'].trim() } : {}),
  pinned: args.flags.has('pinned'),
  systemNotify: args.flags.has('notify'),
  ...(args.values['min-version'] ? { minAppVersion: args.values['min-version'].trim() } : {}),
  ...(args.values['max-version'] ? { maxAppVersion: args.values['max-version'].trim() } : {}),
  ...(route
    ? {
        actionLabel: (
          args.values['action-label'] ?? (route.startsWith('https://') ? 'Перейти по ссылке' : 'Открыть')
        ).trim(),
        route,
      }
    : {}),
  ...(secondaryRoute
    ? {
        secondaryActionLabel: (args.values['secondary-action-label'] ?? 'Подробнее').trim(),
        secondaryRoute,
      }
    : {}),
};

if (args.flags.has('dry-run')) {
  console.log(JSON.stringify(item, null, 2));
  process.exit(0);
}

const existing = fs.existsSync(FEED_PATH)
  ? JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'))
  : { version: 1, updatedAt: nowIso, items: [] };

const prevItems = Array.isArray(existing.items) ? existing.items : [];
const filtered = prevItems.filter((entry) => entry?.id !== id);
const nextFeed = {
  version: 1,
  updatedAt: nowIso,
  items: [item, ...filtered].slice(0, 50),
};

fs.writeFileSync(FEED_PATH, `${JSON.stringify(nextFeed, null, 2)}\n`, 'utf8');
console.log(`✓ Добавлено уведомление "${id}" в site/announcements.json`);
console.log('  Для публикации отправьте изменения в main: git add site/announcements.json && git commit -m "chore(news): publish announcement" && git push');
