import { colors, type AppIconName } from '@/design-system';
import type { FeedIconKind, FeedTone } from '@/domain/notifications/feed';

export function iconFor(kind: FeedIconKind): AppIconName {
  switch (kind) {
    case 'check':
      return 'checkCircle';
    case 'sync':
      return 'sync';
    case 'warning':
      return 'warning';
    case 'insight':
      return 'insight';
    case 'release':
      return 'download';
    case 'news':
      return 'news';
    case 'tip':
      return 'school';
  }
}

export function pillToneFor(tone: FeedTone): 'success' | 'warning' | 'error' | 'info' {
  switch (tone) {
    case 'ok':
      return 'success';
    case 'warn':
      return 'warning';
    case 'err':
      return 'error';
    case 'info':
      return 'info';
  }
}

export function iconTintFor(tone: FeedTone, unread: boolean): string {
  switch (tone) {
    case 'err':
      return colors.error;
    case 'warn':
      return colors.warning;
    case 'ok':
      return colors.primary;
    case 'info':
      return unread ? colors.primary : colors.textMuted;
  }
}

export function iconSurfaceFor(tone: FeedTone, unread: boolean): string {
  if (!unread && tone === 'info') return colors.surfaceHigh;
  switch (tone) {
    case 'err':
      return colors.errorSoft;
    case 'warn':
      return colors.warningSoft;
    case 'ok':
    case 'info':
      return unread ? colors.primarySoft : colors.surfaceHigh;
  }
}

export function badgeColorFor(tone: FeedTone, unread: boolean): string {
  switch (tone) {
    case 'err':
      return colors.error;
    case 'warn':
      return colors.warning;
    case 'ok':
      return colors.primary;
    case 'info':
      return unread ? colors.successSoft : colors.textMuted;
  }
}
