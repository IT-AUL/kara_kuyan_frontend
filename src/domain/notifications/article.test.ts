import {
  estimateReadMinutes,
  formatArticleFullDate,
  formatFeedShortDate,
  parseArticleContent,
} from './article';

describe('editorial article parser & date formatter', () => {
  it('parses headings, paragraphs, bullet lists, numbered steps, and callouts cleanly', () => {
    const summary = 'Короткий лид для превью в ленте и шапки статьи.';
    const body = [
      'Вводный абзац статьи с объяснением контекста для учителя.',
      '',
      '### Что изменилось в сканере',
      '- Оптический зум 1.4x убирает тень телефона с парты.',
      '- Подсветка «Свет» помогает в пасмурный день.',
      '',
      '### Как сканировать пачку за 1,5 минуты',
      '1. Положите стопку работ на ровный стол.',
      '2. Включите режим 1.4x и наведите рамку на 4 маркера.',
      '',
      '> Совет: если лампа бликует на бумаге, слегка поверните лист на 5–10 градусов.',
    ].join('\n');

    const parsed = parseArticleContent(summary, body);
    expect(parsed.lead).toBe(summary);
    expect(parsed.readTimeLabel).toBe('1 мин чтения');
    expect(parsed.blocks).toEqual([
      {
        kind: 'paragraph',
        text: 'Вводный абзац статьи с объяснением контекста для учителя.',
      },
      { kind: 'heading', text: 'Что изменилось в сканере' },
      {
        kind: 'bullets',
        items: [
          'Оптический зум 1.4x убирает тень телефона с парты.',
          'Подсветка «Свет» помогает в пасмурный день.',
        ],
      },
      { kind: 'heading', text: 'Как сканировать пачку за 1,5 минуты' },
      {
        kind: 'steps',
        items: [
          'Положите стопку работ на ровный стол.',
          'Включите режим 1.4x и наведите рамку на 4 маркера.',
        ],
      },
      {
        kind: 'callout',
        text: 'Совет: если лампа бликует на бумаге, слегка поверните лист на 5–10 градусов.',
      },
    ]);
  });

  it('avoids duplicating summary when body equals summary', () => {
    const text = 'Краткое сообщение без отдельного развёрнутого текста.';
    const parsed = parseArticleContent(text, text);
    expect(parsed.lead).toBeNull();
    expect(parsed.blocks).toEqual([{ kind: 'paragraph', text }]);
  });

  it('estimates reading minutes and formats Russian dates accurately', () => {
    const twoMinText = Array.from({ length: 340 }, () => 'слово').join(' ');
    expect(estimateReadMinutes(twoMinText)).toBe(2);

    const now = new Date(2026, 10, 13, 18, 0, 0).getTime();
    const sameDay = new Date(2026, 10, 13, 9, 30, 0).getTime();
    const yesterday = new Date(2026, 10, 12, 14, 0, 0).getTime();
    const earlier = new Date(2026, 10, 5, 10, 0, 0).getTime();

    expect(formatFeedShortDate(sameDay, now)).toBe('Сегодня');
    expect(formatFeedShortDate(yesterday, now)).toBe('Вчера');
    expect(formatFeedShortDate(earlier, now)).toBe('5 нояб.');
    expect(formatArticleFullDate(sameDay)).toBe('13 ноября 2026');
  });
});
