// Builds design-sync/ (tokens + static component previews + brand assets) from src/design-system/tokens.ts.
// Usage: node --experimental-strip-types scripts/design-sync/build-bundle.mjs
// Then run /design-sync in Claude and point it at ./design-sync. Previews mirror src/design-system/components; keep them in step.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '../../src/design-system/tokens.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'design-sync');
rmSync(out, { force: true, recursive: true });
for (const d of ['foundations', 'components', 'brand']) mkdirSync(join(out, d), { recursive: true });

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const px = (n) => `${n}px`;

// ---------- tokens ----------
writeFileSync(join(out, 'tokens.json'), JSON.stringify({ colors, spacing, radius, fontSizes, fontFamilies, touchTarget }, null, 2) + '\n');
const cssVars = [
  ...Object.entries(colors).map(([k, v]) => `  --color-${kebab(k)}: ${v};`),
  ...Object.entries(spacing).map(([k, v]) => `  --space-${k}: ${px(v)};`),
  ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${px(v)};`),
  ...Object.entries(fontSizes).map(([k, v]) => `  --font-size-${kebab(k)}: ${px(v)};`),
  `  --font-family: 'Onest', 'Noto Sans', system-ui, sans-serif;`,
  `  --touch-target: ${px(touchTarget)};`,
];
const tokensCss = `/* Generated from src/design-system/tokens.ts — do not edit. */
:root {\n${cssVars.join('\n')}\n}
`;
writeFileSync(join(out, 'tokens.css'), tokensCss);

// ---------- shared preview chrome ----------
const head = (group, title, extra = '') => `<!-- @dsCard group="${group}" -->
<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap">
<style>
${tokensCss}
*{box-sizing:border-box}
body{margin:0;padding:var(--space-lg);background:var(--color-background);color:var(--color-text);font-family:var(--font-family);font-size:16px;line-height:22px}
.row{display:flex;flex-wrap:wrap;gap:var(--space-sm);align-items:center}
.col{display:flex;flex-direction:column;gap:var(--space-sm)}
.cap{color:var(--color-text-faint);font-size:12px;line-height:16px;font-weight:500}
.muted{color:var(--color-text-muted);font-size:14px;line-height:20px}
${extra}
</style></head><body>`;
const page = (group, title, body, extra) => head(group, title, extra) + body + '</body></html>';
const write = (path, html) => writeFileSync(join(out, path), html);

// ---------- foundations ----------
const swatch = ([k, v]) =>
  `<div class="sw"><div class="chip" style="background:${v}"></div><div><div>${k}</div><div class="cap">${v}</div></div></div>`;
write('foundations/colors.html', page('Colors', 'Цвета',
  `<div class="grid">${Object.entries(colors).filter(([k]) => k !== 'transparent').map(swatch).join('')}</div>`,
  `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-md)}.sw{display:flex;gap:var(--space-sm);align-items:center}.chip{width:44px;height:44px;border-radius:var(--radius-md);border:1px solid var(--color-divider);flex:none}`));

const type = [
  ['Eyebrow', 'font:600 11px/14px var(--font-family);letter-spacing:1.2px;text-transform:uppercase;color:var(--color-primary)', 'Проверка работ'],
  ['Display 30/36 bold', 'font:700 30px/36px var(--font-family)', 'Контрольная работа №3'],
  ['Title 22/28 bold', 'font:700 22px/28px var(--font-family)', 'Исем килешләре һәм кушымчалар'],
  ['Title small 18/24 semibold', 'font:600 18px/24px var(--font-family)', 'Задание 4 · Чыгыш килеше'],
  ['Body 16/22 regular', 'font:400 16px/22px var(--font-family)', 'ӨСТӘЛДӘН или ӨСТӘЛТӘН — проверьте ответ ученика.'],
  ['Body small 14/20 muted', 'font:400 14px/20px var(--font-family);color:var(--color-text-muted)', '11 из 25 ошибаются в -дан/-дән/-тан/-тән'],
  ['Caption 12/16 medium faint', 'font:500 12px/16px var(--font-family);color:var(--color-text-faint)', '18 из 25 проверено'],
  ['Numeric 22 bold tabular', 'font:700 22px var(--font-family);font-variant-numeric:tabular-nums', '74%  3,9  7 из 8'],
];
write('foundations/typography.html', page('Type', 'Типографика',
  `<div class="col" style="gap:var(--space-lg)">${type.map(([n, s, t]) => `<div><div class="cap">${n}</div><div style="${s}">${t}</div></div>`).join('')}</div>
   <p class="muted" style="margin-top:var(--space-xl)">Onest 400/500/600/700, запасной — Noto Sans. Татарские буквы Ә Ө Ү Җ Ң Һ поддерживаются.</p>`));

write('foundations/spacing-radius.html', page('Spacing', 'Отступы и радиусы',
  `<div class="col"><div class="cap">Отступы</div>${Object.entries(spacing).map(([k, v]) => `<div class="row"><div class="cap" style="width:64px">${k} · ${v}</div><div style="height:12px;width:${v * 4}px;background:var(--color-primary);border-radius:3px"></div></div>`).join('')}</div>
   <div class="col" style="margin-top:var(--space-xl)"><div class="cap">Радиусы</div><div class="row">${Object.entries(radius).map(([k, v]) => `<div class="col" style="align-items:center"><div style="width:72px;height:72px;background:var(--color-surface-raised);border:1px solid var(--color-divider);border-radius:${Math.min(v, 36)}px"></div><div class="cap">${k} · ${v}</div></div>`).join('')}</div></div>`));

// ---------- components (static mirrors of src/design-system/components) ----------
const btn = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:54px;padding:0 20px;border-radius:var(--radius-md);font:600 16px var(--font-family);border:1px solid transparent;cursor:pointer';
write('components/button.html', page('Components', 'Button',
  `<div class="col" style="max-width:360px">
   <button style="${btn};background:var(--color-primary);color:var(--color-background)">Продолжить проверку</button>
   <button style="${btn};background:var(--color-surface-raised);border-color:var(--color-divider);color:var(--color-text)">Изменить балл</button>
   <button style="${btn};background:transparent;color:var(--color-primary)">Пропустить</button>
   <button style="${btn};background:var(--color-error-soft);border-color:var(--color-error);color:var(--color-error)">Отметить ошибку</button>
   <button disabled style="${btn};background:var(--color-primary);color:var(--color-background);opacity:.45">Недоступно</button>
   <button style="${btn};min-height:48px;background:var(--color-primary);color:var(--color-background)">Компактная</button></div>`));

const pill = (bg, fg, label) => `<span style="display:inline-flex;gap:4px;align-items:center;padding:8px 12px;border-radius:999px;background:var(${bg});color:var(${fg});font:600 12px var(--font-family)">● ${label}</span>`;
write('components/status-pill.html', page('Components', 'StatusPill',
  `<div class="row">${pill('--color-primary-soft', '--color-success-soft', 'Верно')}${pill('--color-error-soft', '--color-error', 'Ошибка')}${pill('--color-warning-soft', '--color-warning', 'Требует проверки')}${pill('--color-surface-raised', '--color-text-muted', 'Не выполнено')}${pill('--color-primary-soft', '--color-primary', 'Активная проверка')}</div>
   <p class="muted" style="margin-top:var(--space-lg)">Статус никогда не передаётся только цветом: всегда иконка и текст.</p>`));

write('components/card-metric.html', page('Components', 'Card и MetricTile',
  `<div class="col" style="max-width:380px">
   <div class="row" style="align-items:stretch;flex-wrap:nowrap">
   ${[['Средний результат', '74%', 'default', '18 из 25'], ['Оценка', '3,9', 'success', 'по классу'], ['На проверке', '4', 'warning', 'работы']].map(([l, v, t, d]) => `<div style="flex:1;min-width:0;background:var(--color-surface);border:1px solid var(--color-divider);border-radius:var(--radius-md);padding:var(--space-sm)"><div class="cap">${l}</div><div style="font:700 22px var(--font-family);color:${t === 'success' ? 'var(--color-success-soft)' : t === 'warning' ? 'var(--color-warning)' : 'var(--color-text)'}">${v}</div><div class="cap">${d}</div></div>`).join('')}</div>
   <div style="background:var(--color-surface);border-radius:var(--radius-lg);padding:var(--space-lg)">Card · surface</div>
   <div style="background:var(--color-surface-raised);border-radius:var(--radius-lg);padding:var(--space-lg)">Card · raised</div>
   <div style="background:var(--color-surface-soft);border:1px solid var(--color-divider);border-radius:var(--radius-lg);padding:var(--space-lg)">Card · soft, outlined</div></div>`));

write('components/assessment-card.html', page('Components', 'AssessmentCard',
  `<div style="max-width:380px;background:var(--color-surface-raised);border-radius:var(--radius-lg);padding:var(--space-lg);display:flex;flex-direction:column;gap:var(--space-md)">
   <div class="row" style="justify-content:space-between">${pill('--color-primary-soft', '--color-primary', 'Активная проверка')}<span class="cap">2 варианта</span></div>
   <div><div style="font:700 22px/28px var(--font-family)">Контрольная работа №3</div><div class="muted">Исем килешләре һәм кушымчалар</div><div class="cap">7-А · 25 уч.</div></div>
   <div><div class="row" style="justify-content:space-between"><span class="muted">Проверено</span><span style="font:600 18px var(--font-family);color:var(--color-primary)">18 из 25</span></div>
   <div style="height:8px;border-radius:999px;background:var(--color-surface);margin-top:8px;overflow:hidden"><div style="width:72%;height:100%;background:var(--color-primary);border-radius:999px"></div></div></div>
   <div class="row" style="justify-content:space-between"><span style="padding:8px 12px;border-radius:999px;background:var(--color-warning-soft);color:var(--color-warning);font:500 12px var(--font-family)">4 требуют проверки</span>
   <button style="${btn};min-height:48px;background:var(--color-primary);color:var(--color-background)">Продолжить</button></div></div>`));

write('components/list-row-tabs-chips.html', page('Components', 'ListRow, SegmentedTabs, Chips',
  `<div class="col" style="max-width:380px;gap:var(--space-lg)">
   <div style="display:flex;background:var(--color-surface);border-radius:var(--radius-md);padding:4px">${['Задания', 'Ученики', 'Итоги'].map((t, i) => `<div style="flex:1;text-align:center;min-height:40px;line-height:40px;border-radius:var(--radius-sm);font:${i ? 500 : 600} 14px var(--font-family);color:${i ? 'var(--color-text-muted)' : 'var(--color-primary)'};${i ? '' : 'background:var(--color-primary-soft)'}">${t}</div>`).join('')}</div>
   <div class="row" style="gap:8px">${['Все', '7-А', '7-Б'].map((t, i) => `<span style="min-height:40px;line-height:38px;padding:0 16px;border-radius:999px;border:1px solid ${i ? 'var(--color-divider)' : 'var(--color-primary)'};background:${i ? 'var(--color-surface)' : 'var(--color-primary)'};color:${i ? 'var(--color-text)' : 'var(--color-background)'};font:500 14px var(--font-family)">${t}</span>`).join('')}</div>
   <div style="display:flex;gap:12px;align-items:center;background:var(--color-surface);border-radius:var(--radius-md);padding:var(--space-md);min-height:64px"><div style="width:40px;height:40px;border-radius:8px;background:var(--color-primary-soft);color:var(--color-primary);display:grid;place-items:center">▤</div><div style="flex:1"><div>Галиев Амир Р.</div><div class="muted">7A-014 · 7 из 8 · Оценка 5</div></div><span style="color:var(--color-text-faint)">›</span></div></div>`));

const notice = (border, msg) => `<div style="background:var(--color-surface);border:1px solid var(${border});border-radius:var(--radius-md);padding:var(--space-md)" class="muted">${msg}</div>`;
write('components/notice-insight.html', page('Components', 'Notice',
  `<div class="col" style="max-width:380px">${notice('--color-warning', 'Нет сети. Результаты сохранены на устройстве и отправятся позже.')}${notice('--color-error', 'QR-код не распознан. Наведите камеру на лист.')}${notice('--color-divider', 'Рекомендуем повторить окончания -дан/-дән/-тан/-тән: 11 из 25 ошибаются.')}</div>`));

// ---------- brand ----------
cpSync(join(root, 'assets/branding/icon.svg'), join(out, 'brand/icon.svg'));
cpSync(join(root, 'assets/branding/logo.svg'), join(out, 'brand/logo.svg'));
write('brand/logo.html', page('Brand', 'Логотип и иконка',
  `<div class="row" style="gap:var(--space-xl)"><div class="col" style="align-items:center"><img src="icon.svg" width="120" height="120" alt="Иконка"><div class="cap">Иконка приложения</div></div>
   <div class="col" style="align-items:center"><img src="logo.svg" width="120" height="120" alt="Знак"><div class="cap">Знак (#25E38A)</div></div></div>`));

writeFileSync(join(out, 'README.md'), `# Kara Kuyan — design system (для Claude Design)

Android-first приложение для учителей татарского языка: печать → скан → проверка → оценка → выводы. Тёмная тема, спокойный «премиальный инструмент».

## Принципы
- Тёмная тема по умолчанию: фон \`#0B0F0D\`, поверхности \`#141A17\` / \`#1B241F\`.
- Зелёный \`#25E38A\` — действие, «готово», верно. Янтарный — требует проверки. Красный — только подтверждённая ошибка.
- Статус никогда не передаётся одним цветом: иконка + текст.
- Один главный CTA на экран; меньше карточек и рамок. Радиусы: карточки 16, поля 12, чипы — pill.
- Цели нажатия ≥ 48dp (главные кнопки 52–56), контраст AA, у интерактивных элементов есть подпись.
- Шрифт Onest (запасной Noto Sans). Интерфейс на русском; татарский — только в учебном содержимом.
- Никаких рейтингов учеников и ярлыков «слабый / отстаёт». Рекомендации осторожные: «Рекомендуем повторить».

## Состав
- \`tokens.css\`, \`tokens.json\` — цвета, отступы, радиусы, размеры шрифта (генерируются из \`src/design-system/tokens.ts\`).
- \`foundations/\` — цвета, типографика, отступы и радиусы.
- \`components/\` — Button, StatusPill, Card, MetricTile, AssessmentCard, ListRow, SegmentedTabs, Chips, Notice.
- \`brand/\` — иконка и знак.
`);
console.log('design-sync/ built');
