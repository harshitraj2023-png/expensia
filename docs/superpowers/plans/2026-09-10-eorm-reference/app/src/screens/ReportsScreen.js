import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { apiGet } from '../api';
import { colors, spacing, money } from '../theme';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function ReportsScreen() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (pullToRefresh) => {
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setReport(await apiGet(`/summary/year?year=${year}`));
        setError('');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [year]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const months = report ? report.months : [];
  const maxExpense = months.reduce((highest, entry) => Math.max(highest, entry.expense), 0);
  const ranked = report
    ? report.categories.filter((category) => category.spent > 0).sort((a, b) => b.spent - a.spent)
    : [];

  return (
    <Screen
      loading={loading && !report}
      error={error}
      onRetry={() => load(false)}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <View style={styles.yearBar}>
        <Pressable style={styles.arrow} onPress={() => setYear(year - 1)}>
          <Text style={styles.arrowText}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Pressable style={styles.arrow} onPress={() => setYear(year + 1)}>
          <Text style={styles.arrowText}>{'›'}</Text>
        </Pressable>
      </View>

      <Card style={styles.section}>
        <Text style={styles.heading}>Spending by month</Text>
        {months.map((entry, index) => (
          <View key={entry.month} style={styles.monthRow}>
            <Text style={styles.monthLabel}>{MONTH_LABELS[index]}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${maxExpense > 0 ? (entry.expense / maxExpense) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.monthAmount} numberOfLines={1}>
              {money(entry.expense)}
            </Text>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.heading}>{year} totals</Text>
        <View style={styles.totals}>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Income</Text>
            <Text style={[styles.totalValue, { color: colors.income }]}>
              {money(report ? report.income_total : 0)}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Spent</Text>
            <Text style={[styles.totalValue, { color: colors.expense }]}>
              {money(report ? report.expense_total : 0)}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Saved</Text>
            <Text style={[styles.totalValue, { color: colors.savings }]}>
              {money(report ? report.savings_total : 0)}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.heading}>Where it went</Text>
        {ranked.length === 0 ? (
          <EmptyState message={`No expenses recorded in ${year}.`} />
        ) : (
          ranked.map((category) => {
            const share =
              report.expense_total > 0
                ? Math.round((category.spent / report.expense_total) * 100)
                : 0;
            return (
              <View key={category.name} style={styles.categoryRow}>
                <View style={styles.categoryHead}>
                  <View style={[styles.dot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryShare}>{share}%</Text>
                  <Text style={styles.categoryAmount}>{money(category.spent)}</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${share}%`, backgroundColor: category.color }]}
                  />
                </View>
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  yearBar: {
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
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: colors.primary,
    fontSize: 22,
  },
  year: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.md,
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthLabel: {
    color: colors.muted,
    fontSize: 12,
    width: 30,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.expense,
  },
  monthAmount: {
    color: colors.text,
    fontSize: 12,
    width: 86,
    textAlign: 'right',
  },
  totals: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  total: {
    flex: 1,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  categoryRow: {
    marginBottom: spacing.md,
  },
  categoryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryShare: {
    color: colors.muted,
    fontSize: 12,
  },
  categoryAmount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
