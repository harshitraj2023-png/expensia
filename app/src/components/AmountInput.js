import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, CURRENCY, sanitizeAmount } from '../theme';

export default function AmountInput({ value, onChangeText, autoFocus }) {
  return (
    <View style={styles.row}>
      <Text style={styles.currency}>{CURRENCY}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChangeText(sanitizeAmount(text))}
        autoFocus={autoFocus}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        autoComplete="off"
        autoCorrect={false}
        textContentType="none"
        placeholder="0"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  currency: {
    color: colors.muted,
    fontSize: 32,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
    paddingVertical: spacing.sm,
  },
});
