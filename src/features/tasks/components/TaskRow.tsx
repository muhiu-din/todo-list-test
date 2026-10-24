import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';
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
  return (
    <View style={[styles.row, task.completed && styles.completedRow, isEditing && styles.editingRow]}>
      <Pressable
        accessibilityLabel={task.completed ? 'Mark task active' : 'Mark task complete'}
        onPress={() => onToggle(task)}
        style={[styles.check, task.completed && styles.checkDone, isEditing && styles.checkEditing]}
      >
        {task.completed && <Ionicons name="checkmark" size={15} color={colors.white} />}
      </Pressable>

      <View style={styles.content}>
        <View style={styles.titleLine}>
          <Text numberOfLines={2} style={[styles.title, task.completed && styles.titleDone, isEditing && styles.titleEditing]}>
            {task.title}
          </Text>
          {isEditing && (
            <View style={styles.editingTag}>
              <Text style={styles.editingTagText}>Editing</Text>
            </View>
          )}
        </View>

        {task.notes && <Text numberOfLines={2} style={styles.notes}>{task.notes}</Text>}

        <View style={styles.metaRow}>
          {task.reminderAt ? (
            <View style={styles.reminderBadge}>
              <Ionicons name="alarm-outline" size={12} color={colors.coral} />
              <Text style={styles.reminderMeta}>{formatReminder(task.reminderAt)}</Text>
            </View>
          ) : (
            <Text style={styles.meta}>Added today</Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Edit ${task.title}`}
          hitSlop={8}
          onPress={() => onEdit(task)}
          style={[styles.iconButton, isEditing && styles.iconButtonActive]}
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
  row: { minHeight: 68, marginBottom: spacing.sm, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  completedRow: { backgroundColor: '#FCFDFB' },
  editingRow: { borderColor: colors.coral, backgroundColor: '#FFF9F7', borderWidth: 1.5 },
  check: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 1.5, borderColor: '#C3D0C8', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkEditing: { borderColor: colors.coral },
  content: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { color: colors.ink, fontSize: typography.body, fontWeight: '600', flexShrink: 1 },
  titleDone: { color: '#9CA8A2', textDecorationLine: 'line-through' },
  titleEditing: { color: colors.coral },
  editingTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: '#FDEAE6' },
  editingTagText: { color: colors.coral, fontSize: 10, fontWeight: '800' },
  notes: { marginTop: 3, color: colors.muted, fontSize: 12 },
  metaRow: { marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  meta: { color: '#A2ADA8', fontSize: typography.label },
  reminderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FBE9E5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  reminderMeta: { color: colors.coral, fontSize: typography.label, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.xs },
  iconButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconButtonActive: { backgroundColor: '#FDEAE6', borderRadius: radii.sm },
});

