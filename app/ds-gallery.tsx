import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AccuracyBar,
  Avatar,
  AvatarStack,
  BottomSheet,
  Button,
  colors,
  DeltaTag,
  GradePill,
  HeroCard,
  MiniBars,
  ProgressStrip,
  SegmentBar,
  SegmentedTabs,
  spacing,
  Tag,
  textStyles,
  Toast,
} from '@/design-system';

const GALLERY_NAMES = [
  'Абдуллина Алия',
  'Валиев Тимур',
  'Габдуллин Азат',
  'Гарипов Айдар',
  'Закирова Дина',
  'Зарипов Ильнур',
  'Исмагилова Лейсан',
  'Каримов Булат',
];

const TABS = ['Все 16', 'Осталось 6', 'Разбор 3'] as const;

export default function DesignSystemGalleryScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleShowToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <Text style={styles.sectionTitle}>Кнопки</Text>
        <View style={styles.columnGap}>
          <Button icon="scan" title="Проверить стопку" variant="primary" />
          <Button icon="print" title="Печать бланков" variant="secondary" />
          <Button title="Позже" variant="ghost" />
          <Button icon="close" title="Ошибка" variant="danger" />
          <Button compact icon="check" title="Компактная кнопка" variant="primary" />
        </View>

        <Text style={styles.sectionTitle}>Теги</Text>
        <View style={styles.rowWrap}>
          <Tag icon="check" label="Усвоено" tone="ok" />
          <Tag icon="classes" label="Группа · 4" tone="mid" />
          <Tag icon="warning" label="Всем классом" tone="bad" />
          <Tag icon="person" label="Лично · 2" tone="info" />
          <Tag label="Без изменений" tone="neutral" />
          <Tag color={colors.ruleSin} label="Сингармонизм" tone="rule" />
        </View>

        <Text style={styles.sectionTitle}>Аватары</Text>
        <View style={styles.rowWrap}>
          <Avatar name="Гарипов Айдар" ring="none" />
          <Avatar name="Абдуллина Алия" ring="done" />
          <Avatar name="Закирова Дина" ring="review" />
        </View>
        <View style={styles.subBlock}>
          <AvatarStack names={GALLERY_NAMES} />
        </View>

        <Text style={styles.sectionTitle}>Оценки</Text>
        <View style={styles.rowWrap}>
          <GradePill grade={5} />
          <GradePill grade={4} />
          <GradePill grade={3} />
          <GradePill grade={2} />
        </View>

        <Text style={styles.sectionTitle}>Полоса прогресса</Text>
        <ProgressStrip done={10} review={3} total={16} />

        <Text style={styles.sectionTitle}>Распределение оценок</Text>
        <SegmentBar
          segments={[
            { color: colors.grade5, label: '5', value: 6 },
            { color: colors.grade4, label: '4', value: 2 },
            { color: colors.grade3, label: '3', value: 6 },
            { color: colors.grade2, label: '2', value: 2 },
          ]}
          showCounts
        />

        <Text style={styles.sectionTitle}>Динамика и мини-столбики</Text>
        <View style={styles.rowWrap}>
          <DeltaTag value={3} />
          <DeltaTag value={-5} />
          <MiniBars values={[34, 38, 44, 47, 50]} />
        </View>

        <Text style={styles.sectionTitle}>Точность по темам</Text>
        <View style={styles.columnGap}>
          <AccuracyBar caption="15 из 16 верно" label="Лексика" value={94} />
          <AccuracyBar caption="10 из 16 верно" label="Урын-вакыт килеше" value={63} />
          <AccuracyBar caption="6 из 16 верно" label="Юнәлеш килеше" value={38} />
        </View>

        <Text style={styles.sectionTitle}>Главный блок</Text>
        <HeroCard>
          <Text style={styles.heroTitle}>Контрольная «Килешләр»</Text>
          <View style={styles.subBlock}>
            <ProgressStrip done={10} review={3} total={16} />
          </View>
        </HeroCard>

        <Text style={styles.sectionTitle}>Вкладки</Text>
        <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />

        <Text style={styles.sectionTitle}>Шторка и уведомление</Text>
        <View style={styles.columnGap}>
          <Button
            onPress={() => setSheetVisible(true)}
            title="Показать шторку"
            variant="secondary"
          />
          <Button onPress={handleShowToast} title="Показать тост" variant="secondary" />
        </View>
      </ScrollView>

      <BottomSheet
        onClose={() => setSheetVisible(false)}
        title="Это работа Гарипова Айдара?"
        visible={sheetVisible}
      >
        <View style={styles.columnGap}>
          <Button onPress={() => setSheetVisible(false)} title="Да, это он" variant="primary" />
          <Button
            onPress={() => setSheetVisible(false)}
            title="Выбрать другого"
            variant="secondary"
          />
        </View>
      </BottomSheet>

      <Toast
        actionLabel="Отменить"
        message="Засчитано"
        onAction={() => setToastVisible(false)}
        visible={toastVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  columnGap: {
    gap: spacing.sm,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    ...textStyles.titleSmall,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  rowWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    ...textStyles.titleSmall,
    marginTop: spacing.xs,
  },
  subBlock: {
    marginTop: spacing.sm,
  },
});
