import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function CategoryChips({ categories, selectedId, onSelect, onAddNew }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {categories.map((category) => {
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[
              styles.chip,
              { borderColor: category.color },
              selected && { backgroundColor: category.color },
            ]}
          >
            <Text style={[styles.chipText, selected ? styles.chipTextSelected : { color: category.color }]}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
      <Pressable onPress={onAddNew} style={[styles.chip, styles.addChip]}>
        <Text style={[styles.chipText, styles.addChipText]}>+ Add new</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.card,
  },
  addChip: {
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addChipText: {
    color: colors.muted,
  },
});
