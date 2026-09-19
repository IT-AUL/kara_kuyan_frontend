import { StyleSheet, Text, TextInput, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '../tokens';

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

export function Field({ label, value, onChangeText, placeholder, multiline = false, autoCapitalize = 'sentences' }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={textStyles.bodySmall}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, multiline && styles.multiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  multiline: { minHeight: 160, paddingTop: spacing.sm },
  wrap: { gap: spacing.xs },
});
