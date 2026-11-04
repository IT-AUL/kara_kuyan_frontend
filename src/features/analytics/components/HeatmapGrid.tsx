import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontFamilies,
  gradeColor,
  radius,
  spacing,
  textStyles,
  touchTarget,
  zoneColor,
} from '@/design-system';

export type HeatmapStudent = {
  id: string;
  name: string;
  grade: number | null;
  cells: (boolean | null)[];
};

export type HeatmapColumn = {
  number: number;
  accuracyPct: number;
};

export type HeatmapGridProps = {
  students: HeatmapStudent[];
  columns: HeatmapColumn[];
  highlight: number | null;
  onColumnPress: (n: number) => void;
  onStudentPress?: (id: string) => void;
};

export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return fullName.trim();
  }
  const initial = parts[1].charAt(0).toUpperCase();
  return `${parts[0]} ${initial}.`;
}

export function HeatmapGrid({
  students,
  columns,
  highlight,
  onColumnPress,
  onStudentPress,
}: HeatmapGridProps) {
  const highlightIndex =
    highlight !== null ? columns.findIndex((c) => c.number === highlight) : -1;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.nameColumn} />
        <View style={styles.cellsRow}>
          {columns.map((col) => {
            const isSelected = highlight === col.number;
            const roundedAcc = Math.round(col.accuracyPct);
            return (
              <Pressable
                accessibilityLabel={`Задание ${col.number}, ${roundedAcc}%`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                hitSlop={4}
                key={col.number}
                onPress={() => onColumnPress(col.number)}
                style={({ pressed }) => [
                  styles.columnHeader,
                  isSelected && styles.columnHeaderSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={textStyles.caption}>{col.number}</Text>
                <Text
                  style={[
                    styles.columnAccuracy,
                    { color: zoneColor(col.accuracyPct) },
                  ]}
                >
                  {roundedAcc}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.gradeColumn} />
      </View>

      {students.map((student) => {
        const shortName = formatShortName(student.name);
        const erredInHighlight =
          highlightIndex >= 0 && student.cells[highlightIndex] === false;

        return (
          <View key={student.id} style={styles.studentRow}>
            <Pressable
              accessibilityLabel={`Ученик ${student.name}`}
              accessibilityRole="button"
              disabled={!onStudentPress}
              hitSlop={4}
              onPress={() => onStudentPress?.(student.id)}
              style={({ pressed }) => [
                styles.nameColumn,
                pressed && onStudentPress && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  textStyles.bodySmall,
                  highlight !== null &&
                    (erredInHighlight ? styles.nameHighlighted : styles.nameDimmed),
                ]}
              >
                {shortName}
              </Text>
            </Pressable>

            <View style={styles.cellsRow}>
              {columns.map((col, colIndex) => {
                const cell = student.cells[colIndex] ?? null;
                const isDimmed = highlight !== null && highlight !== col.number;
                const cellBg =
                  cell === true
                    ? colors.zoneOk
                    : cell === false
                      ? colors.zoneBad
                      : colors.surfaceHigh;
                const cellOpacity = isDimmed
                  ? 0.22
                  : cell === true
                    ? 0.78
                    : cell === false
                      ? 0.85
                      : 1;
                const statusWord =
                  cell === true
                    ? 'верно'
                    : cell === false
                      ? 'ошибка'
                      : 'нет данных';

                return (
                  <View
                    accessibilityLabel={`Задание ${col.number}: ${statusWord}`}
                    key={col.number}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: cellBg,
                        opacity: cellOpacity,
                      },
                    ]}
                  />
                );
              })}
            </View>

            <Text
              style={[
                styles.gradeText,
                styles.gradeColumn,
                {
                  color:
                    student.grade !== null
                      ? gradeColor(student.grade)
                      : colors.textFaint,
                },
              ]}
            >
              {student.grade !== null ? student.grade : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 6,
    flex: 1,
    height: 22,
  },
  cellsRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  columnAccuracy: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    lineHeight: 14,
  },
  columnHeader: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingVertical: spacing.xxs,
  },
  columnHeaderSelected: {
    backgroundColor: colors.surfaceHigh,
  },
  container: {
    gap: spacing.xxs,
  },
  gradeColumn: {
    textAlign: 'center',
    width: 26,
  },
  gradeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  headerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingBottom: spacing.xxs,
  },
  nameColumn: {
    paddingRight: spacing.xxs,
    width: 110,
  },
  nameDimmed: {
    color: colors.textFaint,
  },
  nameHighlighted: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  studentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    minHeight: 26,
  },
});
