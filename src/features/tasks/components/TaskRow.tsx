import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';
import { formatReminder } from '../taskUtils';
import type { Task } from '../types';

type TaskRowProps = {
  task: Task;
  isEditing?: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskRow({ task, isEditing, onToggle, onEdit, onDelete }: TaskRowProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderColor: colors.line,
          backgroundColor: colors.card,
        },
        task.completed && {
          backgroundColor: isDark ? '#171E1B' : '#FCFDFB',
          opacity: 0.75,
        },
        isEditing && [
          styles.editingRow,
          {
            borderColor: colors.coral,
            backgroundColor: isDark ? '#2B231E' : '#FFF9F7',
          },
        ],
      ]}
    >
      <Pressable
        accessibilityLabel={task.completed ? 'Mark task active' : 'Mark task complete'}
        onPress={() => onToggle(task)}
        style={[
          styles.check,
          { borderColor: colors.line },
          task.completed && { backgroundColor: colors.coral, borderColor: colors.coral },
          isEditing && { borderColor: colors.coral },
        ]}
      >
        {task.completed && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
      </Pressable>

      <View style={styles.content}>
        <View style={styles.titleLine}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              { color: colors.ink },
              task.completed && [styles.titleDone, { color: colors.muted }],
              isEditing && { color: colors.coral },
            ]}
          >
            {task.title}
          </Text>
          {isEditing && (
            <View style={[styles.editingTag, { backgroundColor: colors.coralMuted }]}>
              <Text style={[styles.editingTagText, { color: colors.coral }]}>Editing</Text>
            </View>
          )}
        </View>

        {task.notes && (
          <Text numberOfLines={2} style={[styles.notes, { color: colors.muted }]}>
            {task.notes}
          </Text>
        )}

        <View style={styles.metaRow}>
          {task.reminderAt ? (
            <View style={[styles.reminderBadge, { backgroundColor: colors.coralMuted }]}>
              <Ionicons name="alarm-outline" size={12} color={colors.coral} />
              <Text style={[styles.reminderMeta, { color: colors.coral }]}>
                {formatReminder(task.reminderAt)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.meta, { color: colors.muted }]}>Added today</Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Edit ${task.title}`}
          hitSlop={8}
          onPress={() => onEdit(task)}
          style={[
            styles.iconButton,
            isEditing && [styles.iconButtonActive, { backgroundColor: colors.coralMuted }],
          ]}
        >
          <Ionicons name="pencil" size={17} color={isEditing ? colors.coral : colors.muted} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Delete ${task.title}`}
          hitSlop={8}
          onPress={() => onDelete(task)}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={21} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  editingRow: {
    borderWidth: 1.5,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '600',
    flexShrink: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  editingTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  editingTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  notes: {
    marginTop: 3,
    fontSize: 12,
  },
  metaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: typography.label,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  reminderMeta: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    borderRadius: radii.sm,
  },
});
