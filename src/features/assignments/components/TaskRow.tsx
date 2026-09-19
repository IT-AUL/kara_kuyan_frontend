import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyles } from '@/design-system';
import { colors, hairline, radius, spacing, touchTarget } from '@/design-system/tokens';

import { CellBoxes } from './CellBoxes';

type TaskRowProps = {
  index?: number;
  prompt: string;
  topicName: string;
  answer: string;
  cellCount: number;
  onPress?: () => void;
  accessibilityState?: { checked?: boolean; disabled?: boolean };
  right?: ReactNode;
  footer?: ReactNode;
  /** Smaller cells, two-line prompt: more tasks per screen (bank lists). */
  dense?: boolean;
};

/** One task of a test: prompt, topic and the printed answer row. Used by the builder, bank picker and test detail. */
export function TaskRow({ index, prompt, topicName, answer, cellCount, onPress, accessibilityState, right, footer, dense = false }: TaskRowProps) {
  const body = (
    <View style={styles.inner}>
      {index !== undefined ? (
        <View style={styles.number}><Text style={styles.numberText}>{index}</Text></View>
      ) : null}
      <View style={styles.copy}>
        <Text numberOfLines={dense ? 2 : 3} selectable={!onPress} style={textStyles.body}>{prompt}</Text>
        <Text numberOfLines={1} style={textStyles.caption}>{topicName}</Text>
        <CellBoxes answer={answer} cellCount={cellCount} size={dense ? 18 : 22} />
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
  return (
    <View style={styles.card}>
      {onPress ? (
        <Pressable accessibilityLabel={`${prompt}. ${topicName}`} accessibilityRole="checkbox" accessibilityState={accessibilityState} android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }} onPress={onPress}>
          {body}
        </Pressable>
      ) : (
        body
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.lg, borderWidth: hairline, overflow: 'hidden' },
  copy: { flex: 1, gap: spacing.xs },
  inner: { flexDirection: 'row', gap: spacing.sm, minHeight: touchTarget + 8, padding: spacing.sm + 2 },
  number: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  numberText: { color: colors.successSoft, fontSize: 13, fontWeight: '700' },
  right: { alignItems: 'center', justifyContent: 'center' },
});
