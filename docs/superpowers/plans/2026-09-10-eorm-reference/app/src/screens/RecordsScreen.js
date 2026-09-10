import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Screen from '../components/Screen';
import MonthPicker from '../components/MonthPicker';
import EmptyState from '../components/EmptyState';
import { apiGet, apiPut, apiDelete } from '../api';
import { colors, spacing, money } from '../theme';

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
  { key: 'saving', label: 'Saving' },
];

const ENDPOINT = {
  expense: '/expenses',
  income: '/income',
  saving: '/savings',
};

const TYPE_COLOR = {
  expense: colors.expense,
  income: colors.income,
  saving: colors.savings,
};

function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function rowLabel(item) {
  if (item.type === 'expense') return item.category_name || 'Uncategorized';
  if (item.type === 'income') return item.source || 'Income';
  return 'Saving';
}

export default function RecordsScreen() {
  const [month, setMonth] = useState(thisMonth());
  const [typeFilter, setTypeFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const load = useCallback(
    async (pullToRefresh) => {
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [expenses, income, savings, categoryList] = await Promise.all([
          apiGet(`/expenses?month=${month}`),
          apiGet(`/income?month=${month}`),
          apiGet(`/savings?month=${month}`),
          apiGet('/categories'),
        ]);
        const merged = [
          ...expenses.map((item) => ({ ...item, type: 'expense' })),
          ...income.map((item) => ({ ...item, type: 'income' })),
          ...savings.map((item) => ({ ...item, type: 'saving' })),
        ];
        merged.sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? 1 : -1;
          return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });
        setRows(merged);
        setCategories(categoryList);
        setError('');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  function openEditor(item) {
    setDatePickerOpen(false);
    setDraft({
      id: item.id,
      type: item.type,
      amount: String(item.amount),
      date: item.date,
      note: item.note || '',
      category_id: item.category_id || null,
    });
  }

  function closeEditor() {
    setDatePickerOpen(false);
    setDraft(null);
  }

  async function saveDraft() {
    const body = { amount: Number(draft.amount), date: draft.date, note: draft.note };
    if (draft.type === 'expense') body.category_id = draft.category_id;
    try {
      await apiPut(`${ENDPOINT[draft.type]}/${draft.id}`, body);
      closeEditor();
      load(false);
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  }

  function confirmDelete(item) {
    Alert.alert('Delete entry?', `${money(item.amount)} — ${rowLabel(item)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`${ENDPOINT[item.type]}/${item.id}`);
            load(false);
          } catch (e) {
            Alert.alert('Could not delete', e.message);
          }
        },
      },
    ]);
  }

  const visible = typeFilter === 'all' ? rows : rows.filter((item) => item.type === typeFilter);

  return (
    <>
      <Screen
        loading={loading && rows.length === 0}
        error={error}
        onRetry={() => load(false)}
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <MonthPicker month={month} onChange={setMonth} />

        <View style={styles.filters}>
          {TYPE_FILTERS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setTypeFilter(option.key)}
              style={[styles.filter, typeFilter === option.key && styles.filterActive]}
            >
              <Text
                style={[styles.filterText, typeFilter === option.key && styles.filterTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {visible.length === 0 ? (
          <EmptyState message="No entries for this month." />
        ) : (
          visible.map((item) => (
            <Pressable
              key={`${item.type}-${item.id}`}
              onPress={() => openEditor(item)}
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.accent, { backgroundColor: TYPE_COLOR[item.type] }]} />
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {rowLabel(item)}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.note ? `${item.date}  ·  ${item.note}` : item.date}
                </Text>
              </View>
              <Text style={[styles.rowAmount, { color: TYPE_COLOR[item.type] }]}>
                {money(item.amount)}
              </Text>
            </Pressable>
          ))
        )}
      </Screen>

      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {draft ? (
                <>
                  <Text style={styles.sheetTitle}>Edit {draft.type}</Text>

                  <Text style={styles.fieldLabel}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.amount}
                    onChangeText={(text) => setDraft({ ...draft, amount: text })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />

                  <Text style={styles.fieldLabel}>Date</Text>
                  <Pressable style={styles.input} onPress={() => setDatePickerOpen(!datePickerOpen)}>
                    <Text style={styles.inputText}>{draft.date}</Text>
                  </Pressable>
                  {datePickerOpen ? (
                    <DateTimePicker
                      value={parseDate(draft.date)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(event, selected) => {
                        if (Platform.OS !== 'ios') setDatePickerOpen(false);
                        if (selected) {
                          setDraft((current) => ({ ...current, date: formatDate(selected) }));
                        }
                      }}
                    />
                  ) : null}

                  {draft.type === 'expense' ? (
                    <>
                      <Text style={styles.fieldLabel}>Category</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.chips}
                      >
                        <Pressable
                          onPress={() => setDraft({ ...draft, category_id: null })}
                          style={[
                            styles.chip,
                            { borderColor: colors.border },
                            draft.category_id === null && styles.chipSelected,
                          ]}
                        >
                          <Text style={styles.chipText}>Uncategorized</Text>
                        </Pressable>
                        {categories.map((category) => (
                          <Pressable
                            key={category.id}
                            onPress={() => setDraft({ ...draft, category_id: category.id })}
                            style={[
                              styles.chip,
                              { borderColor: category.color },
                              draft.category_id === category.id && { backgroundColor: category.color },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                draft.category_id === category.id
                                  ? styles.chipTextSelected
                                  : { color: category.color },
                              ]}
                            >
                              {category.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </>
                  ) : null}

                  <Text style={styles.fieldLabel}>Note</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.note}
                    onChangeText={(text) => setDraft({ ...draft, note: text })}
                    placeholder="Optional"
                    placeholderTextColor={colors.muted}
                  />

                  <View style={styles.sheetActions}>
                    <Pressable style={[styles.button, styles.cancelButton]} onPress={closeEditor}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.button, styles.saveButton]} onPress={saveDraft}>
                      <Text style={styles.saveText}>Save</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filter: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    opacity: 0.6,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  rowBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 16,
  },
  inputText: {
    color: colors.text,
    fontSize: 16,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    backgroundColor: colors.border,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.card,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveText: {
    color: colors.text,
    fontWeight: '700',
  },
});
