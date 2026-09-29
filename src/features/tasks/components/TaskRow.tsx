import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';
import { formatReminder } from '../taskUtils';
import type { Task } from '../types';

type TaskRowProps = {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskRow({ task, onToggle, onEdit, onDelete }: TaskRowProps) {
  return (
    <View style={[styles.row, task.completed && styles.completedRow]}>
      <Pressable accessibilityLabel={task.completed ? 'Mark task active' : 'Mark task complete'} onPress={() => onToggle(task)} style={[styles.check, task.completed && styles.checkDone]}>
        {task.completed && <Ionicons name="checkmark" size={15} color={colors.white} />}
      </Pressable>
      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, task.completed && styles.titleDone]}>{task.title}</Text>
        {task.notes && <Text numberOfLines={1} style={styles.notes}>{task.notes}</Text>}
        <Text style={styles.meta}>{task.reminderAt ? `Reminder at ${formatReminder(task.reminderAt)}` : 'Added today'}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityLabel={`Edit ${task.title}`} hitSlop={8} onPress={() => onEdit(task)} style={styles.iconButton}>
          <Ionicons name="pencil-outline" size={18} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityLabel={`Delete ${task.title}`} hitSlop={8} onPress={() => onDelete(task)} style={styles.iconButton}>
          <Ionicons name="close" size={21} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, marginBottom: spacing.sm, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md },
  completedRow: { backgroundColor: '#FCFDFB' },
  check: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 1.5, borderColor: '#C3D0C8', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.coral, borderColor: colors.coral },
  content: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: typography.body, fontWeight: '600' },
  titleDone: { color: '#9CA8A2', textDecorationLine: 'line-through' },
  notes: { marginTop: 3, color: colors.muted, fontSize: 11 },
  meta: { marginTop: spacing.xs, color: '#A2ADA8', fontSize: typography.label },
  actions: { flexDirection: 'row', gap: spacing.xs },
  iconButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
});
