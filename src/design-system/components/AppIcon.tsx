import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { colors } from '../tokens';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const iconNames = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  analytics: { ios: 'chart.bar.fill', android: 'analytics', web: 'analytics' },
  arrowBack: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  assignment: { ios: 'doc.text.fill', android: 'assignment', web: 'assignment' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  classes: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  download: { ios: 'square.and.arrow.down.fill', android: 'download', web: 'download' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  error: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  export: { ios: 'square.and.arrow.up.fill', android: 'ios_share', web: 'ios_share' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  insight: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  library: { ios: 'books.vertical.fill', android: 'library_books', web: 'library_books' },
  more: { ios: 'ellipsis.circle.fill', android: 'more_horiz', web: 'more_horiz' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  print: { ios: 'printer.fill', android: 'print', web: 'print' },
  qr: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
  review: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  scan: { ios: 'viewfinder', android: 'crop_free', web: 'crop_free' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  school: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  task: { ios: 'checklist', android: 'task_alt', web: 'task_alt' },
  time: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} satisfies Record<string, SymbolName>;

export type AppIconName = keyof typeof iconNames;

type AppIconProps = {
  name: AppIconName;
  color?: ColorValue;
  size?: number;
};

export function AppIcon({ name, color = colors.text, size = 22 }: AppIconProps) {
  return <SymbolView name={iconNames[name]} tintColor={color} size={size} />;
}
