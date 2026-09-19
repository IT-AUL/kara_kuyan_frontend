import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { demoAssessment } from '@/demo/demo-data';
import {
  AppIcon,
  Button,
  Card,
  Screen,
  ScreenHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, radius, spacing, touchTarget } from '@/design-system/tokens';

type ExportFormat = 'xlsx' | 'csv';

export function ExportGradebookScreen() {
  const router = useRouter();
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [prepared, setPrepared] = useState(false);

  return (
    <Screen
      footer={
        !prepared ? (
          <Button icon="export" onPress={() => setPrepared(true)} title="Подготовить файл" />
        ) : (
          <Button icon="check" onPress={() => router.replace('/')} title="Готово" />
        )
      }
    >
      <ScreenHeader
        eyebrow="Экспорт"
        showBack
        subtitle={`${demoAssessment.title} · ${demoAssessment.className}`}
        title="Журнал оценок"
      />

      <Card style={styles.card}>
        <Text selectable style={textStyles.title}>
          Выберите формат
        </Text>
        <View accessibilityRole="radiogroup" style={styles.formats}>
          {(['xlsx', 'csv'] as const).map((item) => {
            const selected = item === format;
            return (
              <Pressable
                accessibilityLabel={item.toUpperCase()}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => {
                  setFormat(item);
                  setPrepared(false);
                }}
                style={[styles.format, selected && styles.formatSelected]}
              >
                <AppIcon
                  color={selected ? colors.background : colors.primary}
                  name="download"
                  size={24}
                />
                <Text style={[styles.formatText, selected && styles.formatTextSelected]}>
                  {item.toUpperCase()}
                </Text>
                {selected ? <AppIcon color={colors.background} name="check" size={18} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={textStyles.bodySmall}>
          В файл войдут оценки 25 учеников без фотографий и данных распознавания.
        </Text>
      </Card>

      {prepared ? (
        <Card style={styles.prepared}>
          <StatusPill label={`${format.toUpperCase()} подготовлен`} tone="success" />
          <Text style={textStyles.bodySmall}>
            Файл подготовлен. Отправка станет доступна после подключения экспорта.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  format: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: touchTarget + 36,
  },
  formatSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatText: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  formatTextSelected: {
    color: colors.background,
  },
  formats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prepared: {
    backgroundColor: colors.primarySoft,
  },
});
