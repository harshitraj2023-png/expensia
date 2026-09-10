import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
});
