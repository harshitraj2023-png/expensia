import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function EmptyState({ message }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
