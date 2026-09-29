import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type TaskComposerProps = {
  value: string;
  notes: string;
  isEditing: boolean;
  reminderAt: string | null;
  onChangeText: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onReminderChange: (value: string | null) => void;
  onSubmit: () => void;
};

export function TaskComposer({ value, notes, isEditing, reminderAt, onChangeText, onChangeNotes, onReminderChange, onSubmit }: TaskComposerProps) {
  function setReminder(minutes: number) {
    onReminderChange(new Date(Date.now() + minutes * 60 * 1000).toISOString());
  }

  function setTonight() {
    const date = new Date();
    date.setHours(21, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 1);
    onReminderChange(date.toISOString());
  }

  return (
    <View style={styles.panel}>
      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.plus}>+</Text>
          <TextInput
            accessibilityLabel={isEditing ? 'Update task title' : 'New task title'}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={isEditing ? 'Update your task' : 'What needs your attention?'}
            placeholderTextColor="#9BA6A1"
            returnKeyType="done"
            style={styles.input}
            maxLength={120}
          />
        </View>
        <Pressable accessibilityLabel={isEditing ? 'Update task' : 'Add task'} onPress={onSubmit} style={styles.button}>
          <Text style={styles.buttonText}>{isEditing ? 'Update' : 'Add task'}</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.white} />
        </Pressable>
      </View>
      <TextInput accessibilityLabel="Task notes" value={notes} onChangeText={onChangeNotes} placeholder="Optional notes" placeholderTextColor="#9BA6A1" style={styles.notesInput} multiline maxLength={500} />
      <View style={styles.reminderRow}>
        <Text style={styles.reminderLabel}>{reminderAt ? `Reminder at ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(reminderAt))}` : 'Optional reminder'}</Text>
        <View style={styles.reminderActions}>
          <Pressable accessibilityLabel="Remind me in one hour" onPress={() => setReminder(60)} style={styles.reminderChip}><Text style={styles.reminderChipText}>1 hour</Text></Pressable>
          <Pressable accessibilityLabel="Remind me tonight" onPress={setTonight} style={styles.reminderChip}><Text style={styles.reminderChipText}>Tonight</Text></Pressable>
          {reminderAt && <Pressable accessibilityLabel="Clear reminder" onPress={() => onReminderChange(null)} style={styles.clearReminder}><Text style={styles.clearReminderText}>Clear</Text></Pressable>}
        </View>
      </View>
      <Text style={styles.note}>Keep it simple. One small step at a time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  inputRow: { gap: spacing.sm },
  inputWrap: { position: 'relative' },
  plus: { position: 'absolute', zIndex: 1, left: 16, top: 12, color: colors.coral, fontSize: 24 },
  input: { height: 54, paddingHorizontal: spacing.md, paddingLeft: 47, borderRadius: radii.sm, backgroundColor: colors.paper, color: colors.ink, fontSize: typography.body },
  notesInput: { minHeight: 42, maxHeight: 88, marginTop: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, color: colors.ink, backgroundColor: colors.white, fontSize: typography.caption, textAlignVertical: 'top' },
  button: { height: 52, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.ink },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  reminderRow: { marginTop: spacing.md, gap: spacing.sm },
  reminderLabel: { color: colors.muted, fontSize: typography.caption, fontWeight: '600' },
  reminderActions: { flexDirection: 'row', gap: spacing.sm },
  reminderChip: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radii.sm, backgroundColor: colors.mint },
  reminderChipText: { color: '#557362', fontSize: typography.label, fontWeight: '700' },
  clearReminder: { paddingHorizontal: spacing.sm, paddingVertical: 7 },
  clearReminderText: { color: colors.danger, fontSize: typography.label, fontWeight: '700' },
  note: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.caption },
});
