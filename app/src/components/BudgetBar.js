import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, money } from '../theme';

export default function BudgetBar({ name, color, spent, limit, over, pct }) {
  const hasLimit = limit > 0;
  const fillWidth = `${Math.min(Math.max(pct, 0), 100)}%`;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: color || colors.muted }]} />
          <Text style={styles.name}>{name}</Text>
        </View>
        <Text style={styles.amounts}>
          <Text style={[styles.spent, over && styles.spentOver]}>{money(spent)}</Text>
          {hasLimit ? <Text style={styles.limit}>{` / ${money(limit)}`}</Text> : null}
        </Text>
      </View>
      {hasLimit ? (
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: fillWidth, backgroundColor: over ? colors.danger : color || colors.primary }]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  amounts: {
    fontSize: 14,
  },
  spent: {
    color: colors.text,
    fontWeight: '700',
  },
  spentOver: {
    color: colors.danger,
  },
  limit: {
    color: colors.muted,
    fontWeight: '500',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
});
