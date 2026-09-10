import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
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
import Screen from '../components/Screen';
import MonthPicker from '../components/MonthPicker';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { colors, spacing, money, CURRENCY, sanitizeAmount, MAX_AMOUNT } from '../theme';

const PALETTE = [
  '#F97316',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#22C55E',
  '#EF4444',
  '#EAB308',
  '#14B8A6',
  '#6366F1',
  '#94A3B8',
];

function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetsScreen() {
  const [month, setMonth] = useState(thisMonth());
  const [monthTouched, setMonthTouched] = useState(false);
  const [rows, setRows] = useState([]);
  const [limits, setLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadSeq = useRef(0);

  const load = useCallback(
    async (pullToRefresh) => {
      const seq = ++loadSeq.current;
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const budgets = await apiGet(`/budgets?month=${month}`);
        if (seq !== loadSeq.current) return;
        const nextLimits = {};
        budgets.forEach((row) => {
          nextLimits[row.category_id] = row.limit_amount > 0 ? String(row.limit_amount) : '';
        });
        setRows(budgets);
        setLimits(nextLimits);
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

  async function saveLimit(row) {
    const entered = limits[row.category_id];
    const amount = entered ? Number(entered) : 0;
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert('Invalid limit', 'Enter a number of 0 or more.');
      return;
    }
    if (amount > MAX_AMOUNT) {
      Alert.alert('Limit is too large', `The most this app takes is ${money(MAX_AMOUNT)}.`);
      return;
    }
    if (amount === row.limit_amount) return;
    try {
      await apiPut('/budgets', { month, category_id: row.category_id, limit_amount: amount });
      load(false);
    } catch (e) {
      Alert.alert('Could not save budget', e.message);
    }
  }

  function openCategoryActions(row) {
    Alert.alert(row.category_name, 'Rename or delete this category', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Rename',
        onPress: () =>
          setEditingCategory({
            id: row.category_id,
            name: row.category_name,
            color: row.category_color,
          }),
      },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteCategory(row) },
    ]);
  }

  function confirmDeleteCategory(row) {
    Alert.alert(
      `Delete ${row.category_name}?`,
      'Expenses in this category become Uncategorized, and its budgets are removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/categories/${row.category_id}`);
              load(false);
            } catch (e) {
              Alert.alert('Could not delete category', e.message);
            }
          },
        },
      ]
    );
  }

  async function saveCategory() {
    const name = editingCategory.name.trim();
    if (!name) {
      Alert.alert('Invalid name', 'A category needs a name.');
      return;
    }
    try {
      await apiPut(`/categories/${editingCategory.id}`, { name, color: editingCategory.color });
      setEditingCategory(null);
      load(false);
    } catch (e) {
      Alert.alert('Could not save category', e.message);
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await apiPost('/categories', { name });
      setNewCategoryName('');
      setAddingCategory(false);
      load(false);
    } catch (e) {
      Alert.alert('Could not add category', e.message);
    }
  }

  return (
    <>
      <Screen
        loading={loading && rows.length === 0}
        error={error}
        onRetry={() => load(false)}
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <MonthPicker month={month} onChange={changeMonth} />

        <Text style={styles.hint}>
          Set a monthly limit per category. Long-press a category to rename or delete it.
        </Text>

        {rows.map((row) => (
          <Pressable
            key={row.category_id}
            onLongPress={() => openCategoryActions(row)}
            style={styles.row}
          >
            <View style={[styles.dot, { backgroundColor: row.category_color }]} />
            <Text style={styles.name} numberOfLines={1}>
              {row.category_name}
            </Text>
            <Text style={styles.currency}>{CURRENCY}</Text>
            <TextInput
              style={styles.limitInput}
              value={limits[row.category_id] || ''}
              onChangeText={(text) =>
                setLimits((current) => ({ ...current, [row.category_id]: sanitizeAmount(text) }))
              }
              onBlur={() => saveLimit(row)}
              onSubmitEditing={Keyboard.dismiss}
              keyboardType="decimal-pad"
              inputMode="decimal"
              returnKeyType="done"
              autoComplete="off"
              autoCorrect={false}
              textContentType="none"
              placeholder="0"
              placeholderTextColor={colors.muted}
            />
          </Pressable>
        ))}

        {addingCategory ? (
          <View style={styles.row}>
            <TextInput
              style={styles.nameInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={colors.muted}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={addCategory}
            />
            <Pressable style={styles.addButton} onPress={addCategory}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAddingCategory(false);
                setNewCategoryName('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addRow} onPress={() => setAddingCategory(true)}>
            <Text style={styles.addRowText}>+ Add new category</Text>
          </Pressable>
        )}
      </Screen>

      <Modal
        visible={!!editingCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingCategory(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.backdropTap} onPress={Keyboard.dismiss} />
          <View style={styles.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
            >
              {editingCategory ? (
                <>
                  <Text style={styles.sheetTitle}>Edit category</Text>

                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.sheetInput}
                    value={editingCategory.name}
                    onChangeText={(text) => setEditingCategory({ ...editingCategory, name: text })}
                    placeholder="Category name"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={saveCategory}
                  />

                  <Text style={styles.fieldLabel}>Color</Text>
                  <View style={styles.palette}>
                    {PALETTE.map((color) => (
                      <Pressable
                        key={color}
                        onPress={() => setEditingCategory({ ...editingCategory, color })}
                        style={[
                          styles.swatch,
                          { backgroundColor: color },
                          editingCategory.color === color && styles.swatchSelected,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.sheetActions}>
                    <Pressable
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setEditingCategory(null)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.button, styles.saveButton]} onPress={saveCategory}>
                      <Text style={styles.saveText}>Save</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  currency: {
    color: colors.muted,
    fontSize: 14,
  },
  limitInput: {
    width: 96,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 15,
    textAlign: 'right',
  },
  nameInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 15,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  addRow: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addRowText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
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
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 16,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.text,
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
