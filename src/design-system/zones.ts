import { colors } from './tokens';

export type Zone = 'ok' | 'mid' | 'bad';

export function zoneOf(pct: number): Zone {
  if (pct < 50) {
    return 'bad';
  }
  if (pct < 80) {
    return 'mid';
  }
  return 'ok';
}

export function zoneColor(pct: number): string {
  const zone = zoneOf(pct);
  if (zone === 'ok') {
    return colors.zoneOk;
  }
  if (zone === 'mid') {
    return colors.zoneMid;
  }
  return colors.zoneBad;
}

export function gradeColor(grade: number): string {
  if (grade === 5) {
    return colors.grade5;
  }
  if (grade === 4) {
    return colors.grade4;
  }
  if (grade === 3) {
    return colors.grade3;
  }
  return colors.grade2;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
