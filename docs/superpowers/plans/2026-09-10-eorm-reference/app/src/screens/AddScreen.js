import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Screen from '../components/Screen';
import AmountInput from '../components/AmountInput';
import CategoryChips from '../components/CategoryChips';
import { apiGet, apiPost } from '../api';
import { colors, spacing } from '../theme';

const TYPES = [
  { key: 'expense', label: 'Expense', path: '/expenses', color: colors.expense },
  { key: 'income', label: 'Income', path: '/income', color: colors.income },
  { key: 'saving', label: 'Saving', path: '/savings', color: colors.savings },
];

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function toDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function readableDate(value) {
  return toDate(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AddScreen() {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toDateString(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (pullToRefresh) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setCategories(await apiGet('/categories'));
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  function onDateChange(event, selected) {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setDate(toDateString(selected));
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError('Enter a category name');
      return;
    }
    setSavingCategory(true);
    setCategoryError('');
    try {
      const created = await apiPost('/categories', { name });
      setCategories(await apiGet('/categories'));
      setCategoryId(created.id);
      setNewCategoryName('');
      setAddingCategory(false);
    } catch (e) {
      setCategoryError(e.message);
    } finally {
      setSavingCategory(false);
    }
  }

  async function save() {
    const value = Number(amount);
    if (!(value > 0)) {
      setMessage('');
      setError('Enter an amount greater than 0');
      return;
    }
    if (type === 'expense' && !categoryId) {
      setMessage('');
      setError('Pick a category');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (type === 'expense') {
        await apiPost('/expenses', { amount: value, category_id: categoryId, date, note });
      } else if (type === 'income') {
        await apiPost('/income', { amount: value, source, date, note });
      } else {
        await apiPost('/savings', { amount: value, date, note });
      }
      setAmount('');
      setNote('');
      setSource('');
      setMessage('Saved. Add another one.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function changeType(key) {
    setType(key);
    setError('');
    setMessage('');
  }

  const active = TYPES.find((t) => t.key === type);

  return (
    <Screen
      loading={loading && categories.length === 0}
      error={loadError}
      onRetry={() => load(false)}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <View style={styles.segmented}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.segment,
              type === t.key && { backgroundColor: t.color, borderColor: t.color },
            ]}
            onPress={() => changeType(t.key)}
          >
            <Text style={[styles.segmentText, type === t.key && styles.segmentTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Amount</Text>
      <AmountInput
        value={amount}
        onChangeText={(text) => {
          setAmount(text);
          setError('');
          setMessage('');
        }}
        autoFocus
      />

      <Text style={styles.label}>Date</Text>
      <TouchableOpacity style={styles.dateRow} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{readableDate(date)}</Text>
        <Text style={styles.dateHint}>Change</Text>
      </TouchableOpacity>
      {showPicker ? (
        <DateTimePicker
          value={toDate(date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      ) : null}
      {showPicker && Platform.OS === 'ios' ? (
        <TouchableOpacity style={styles.pickerDone} onPress={() => setShowPicker(false)}>
          <Text style={styles.pickerDoneText}>Done</Text>
        </TouchableOpacity>
      ) : null}

      {type === 'expense' ? (
        <View>
          <Text style={styles.label}>Category</Text>
          <CategoryChips
            categories={categories}
            selectedId={categoryId}
            onSelect={(id) => {
              setCategoryId(id);
              setError('');
            }}
            onAddNew={() => {
              setAddingCategory(true);
              setCategoryError('');
            }}
          />
          {addingCategory ? (
            <View style={styles.newCategory}>
              <TextInput
                style={[styles.input, styles.newCategoryInput]}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="New category name"
                placeholderTextColor={colors.muted}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.smallButton, savingCategory && styles.buttonDisabled]}
                onPress={createCategory}
                disabled={savingCategory}
              >
                <Text style={styles.smallButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButtonGhost}
                onPress={() => {
                  setAddingCategory(false);
                  setNewCategoryName('');
                  setCategoryError('');
                }}
              >
                <Text style={styles.smallButtonGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {categoryError ? <Text style={styles.error}>{categoryError}</Text> : null}
        </View>
      ) : null}

      {type === 'income' ? (
        <View>
          <Text style={styles.label}>Source</Text>
          <TextInput
            style={styles.input}
            value={source}
            onChangeText={setSource}
            placeholder="Salary, freelance, gift"
            placeholderTextColor={colors.muted}
          />
        </View>
      ) : null}

      <Text style={styles.label}>Note</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="Optional"
        placeholderTextColor={colors.muted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: active.color }, saving && styles.buttonDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save {active.label}</Text>
        )}
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateText: {
    color: colors.text,
    fontSize: 15,
  },
  dateHint: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pickerDoneText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  newCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  newCategoryInput: {
    flex: 1,
  },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  smallButtonGhost: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  smallButtonGhostText: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
  success: {
    color: colors.income,
    fontSize: 14,
    marginTop: spacing.md,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
