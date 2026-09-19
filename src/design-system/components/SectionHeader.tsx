import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { spacing } from '../tokens';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={textStyles.titleSmall}>{title}</Text>
        {subtitle ? <Text style={textStyles.bodySmall}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
