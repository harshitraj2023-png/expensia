import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import MonthPicker from '../components/MonthPicker';
import BudgetBar from '../components/BudgetBar';
import { apiGet } from '../api';
import { colors, spacing, money } from '../theme';

function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const [month, setMonth] = useState(thisMonth());
  const [monthTouched, setMonthTouched] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSeq = useRef(0);

  const load = useCallback(
    async (pullToRefresh) => {
      const seq = ++loadSeq.current;
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await apiGet(`/summary?month=${month}`);
        if (seq !== loadSeq.current) return;
        setSummary(data);
        setError('');
      } catch (e) {
        if (seq !== loadSeq.current) return;
        setError(e.message);
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [month]
  );

  useFocusEffect(
    useCallback(() => {
      if (!monthTouched) setMonth(thisMonth());
      load(false);
    }, [monthTouched, load])
  );

  function changeMonth(next) {
    setMonth(next);
    setMonthTouched(true);
  }

  const balance = summary ? summary.balance : 0;

  return (
    <Screen
      loading={loading && !summary}
      error={error}
      onRetry={() => load(false)}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <MonthPicker month={month} onChange={changeMonth} />

      <View style={styles.row}>
        <Card style={styles.total}>
          <Text style={styles.label}>Income</Text>
          <Text style={[styles.amount, { color: colors.income }]}>
            {money(summary ? summary.income_total : 0)}
          </Text>
        </Card>
        <Card style={styles.total}>
          <Text style={styles.label}>Spent</Text>
          <Text style={[styles.amount, { color: colors.expense }]}>
            {money(summary ? summary.expense_total : 0)}
          </Text>
        </Card>
      </View>

      <View style={styles.row}>
        <Card style={styles.total}>
          <Text style={styles.label}>Saved</Text>
          <Text style={[styles.amount, { color: colors.savings }]}>
            {money(summary ? summary.savings_total : 0)}
          </Text>
        </Card>
        <Card style={styles.total}>
          <Text style={styles.label}>Balance left</Text>
          <Text style={[styles.amount, { color: balance < 0 ? colors.danger : colors.text }]}>
            {money(balance)}
          </Text>
        </Card>
      </View>

      <Text style={styles.heading}>Budgets</Text>

      {summary && summary.categories.length === 0 ? (
        <Text style={styles.empty}>No categories yet. Add one from the Add tab.</Text>
      ) : null}

      {summary
        ? summary.categories.map((c) => (
            <BudgetBar
              key={c.category_id ?? 'uncategorized'}
              name={c.name}
              color={c.color}
              spent={c.spent}
              limit={c.limit}
              over={c.over}
              pct={c.pct}
            />
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  total: {
    flex: 1,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
  },
  heading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    paddingVertical: spacing.md,
  },
});
