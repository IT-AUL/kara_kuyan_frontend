import { colors } from './tokens';
import { gradeColor, initials, zoneColor, zoneOf } from './zones';

describe('zones helpers', () => {
  describe('zoneOf', () => {
    it('returns bad for values below 50', () => {
      expect(zoneOf(0)).toBe('bad');
      expect(zoneOf(38)).toBe('bad');
      expect(zoneOf(49.9)).toBe('bad');
    });

    it('returns mid for values from 50 up to 80', () => {
      expect(zoneOf(50)).toBe('mid');
      expect(zoneOf(63)).toBe('mid');
      expect(zoneOf(79.9)).toBe('mid');
    });

    it('returns ok for values 80 and above', () => {
      expect(zoneOf(80)).toBe('ok');
      expect(zoneOf(94)).toBe('ok');
      expect(zoneOf(100)).toBe('ok');
    });
  });

  describe('zoneColor', () => {
    it('maps below 50 to zoneBad', () => {
      expect(zoneColor(49.9)).toBe(colors.zoneBad);
    });

    it('maps 50..79.9 to zoneMid', () => {
      expect(zoneColor(50)).toBe(colors.zoneMid);
      expect(zoneColor(79.9)).toBe(colors.zoneMid);
    });

    it('maps 80 and above to zoneOk', () => {
      expect(zoneColor(80)).toBe(colors.zoneOk);
      expect(zoneColor(95)).toBe(colors.zoneOk);
    });
  });

  describe('gradeColor', () => {
    it('returns grade5 for 5', () => {
      expect(gradeColor(5)).toBe(colors.grade5);
    });

    it('returns grade4 for 4 and grade3 for 3', () => {
      expect(gradeColor(4)).toBe(colors.grade4);
      expect(gradeColor(3)).toBe(colors.grade3);
    });

    it('returns grade2 for 2 and any other number', () => {
      expect(gradeColor(2)).toBe(colors.grade2);
      expect(gradeColor(1)).toBe(colors.grade2);
      expect(gradeColor(0)).toBe(colors.grade2);
    });
  });

  describe('initials', () => {
    it('returns two initials for two-word names', () => {
      expect(initials('Гарипов Айдар')).toBe('ГА');
      expect(initials('  Валиев   Тимур  ')).toBe('ВТ');
    });

    it('returns first letter for a single word', () => {
      expect(initials('Айдар')).toBe('А');
      expect(initials('  алия  ')).toBe('А');
    });

    it('returns ? for empty or whitespace-only strings', () => {
      expect(initials('')).toBe('?');
      expect(initials('    ')).toBe('?');
    });
  });
});
