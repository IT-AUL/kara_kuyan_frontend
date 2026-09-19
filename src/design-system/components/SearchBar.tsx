import { StyleSheet, TextInput, View } from 'react-native';

import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '../tokens';
import { AppIcon } from './AppIcon';

type SearchBarProps = {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
};

export function SearchBar({ placeholder = 'Поиск...', value, onChangeText }: SearchBarProps) {
  return (
    <View accessibilityRole="search" style={styles.container}>
      <AppIcon color={colors.textFaint} name="qr" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    paddingVertical: spacing.xs,
  },
});
