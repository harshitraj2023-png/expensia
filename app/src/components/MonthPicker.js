import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function shiftMonth(month, delta) {
  const [year, index] = month.split('-');
  const total = Number(year) * 12 + (Number(index) - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextIndex = total - nextYear * 12;
  return `${nextYear}-${String(nextIndex + 1).padStart(2, '0')}`;
}

function monthLabel(month) {
  const [year, index] = month.split('-');
  return `${MONTH_NAMES[Number(index) - 1]} ${year}`;
}

export default function MonthPicker({ month, onChange }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.arrow} onPress={() => onChange(shiftMonth(month, -1))}>
        <Text style={styles.arrowText}>{'‹'}</Text>
      </Pressable>
      <Text style={styles.label}>{monthLabel(month)}</Text>
      <Pressable style={styles.arrow} onPress={() => onChange(shiftMonth(month, 1))}>
        <Text style={styles.arrowText}>{'›'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  arrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: colors.primary,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
