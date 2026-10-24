import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  onCancel?: () => void;
};

export function TaskComposer({
  value,
  notes,
  isEditing,
  reminderAt,
  onChangeText,
  onChangeNotes,
  onReminderChange,
  onSubmit,
  onCancel,
}: TaskComposerProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  function setReminderMinutes(minutes: number) {
    onReminderChange(new Date(Date.now() + minutes * 60 * 1000).toISOString());
  }

  function setTonight() {
    const date = new Date();
    date.setHours(21, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 1);
    onReminderChange(date.toISOString());
  }

  function setTomorrowMorning() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    onReminderChange(date.toISOString());
  }

  return (
    <View style={[styles.panel, isEditing && styles.editingPanel]}>
      {isEditing && (
        <View style={styles.editingBanner}>
          <View style={styles.editingBadge}>
            <Ionicons name="pencil" size={13} color={colors.coral} />
            <Text style={styles.editingText}>EDITING TASK</Text>
          </View>
          {onCancel && (
            <Pressable accessibilityLabel="Cancel editing" onPress={onCancel} style={styles.cancelChip}>
              <Ionicons name="close" size={14} color={colors.danger} />
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.plus}>{isEditing ? '✎' : '+'}</Text>
          <TextInput
            ref={inputRef}
            accessibilityLabel={isEditing ? 'Update task title' : 'New task title'}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={isEditing ? 'Edit task title' : 'What needs your attention?'}
            placeholderTextColor="#9BA6A1"
            returnKeyType="done"
            style={styles.input}
            maxLength={120}
          />
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            accessibilityLabel={isEditing ? 'Save changes' : 'Add task'}
            onPress={onSubmit}
            style={[styles.button, isEditing && styles.saveButton]}
          >
            <Ionicons name={isEditing ? 'checkmark' : 'arrow-forward'} size={17} color={colors.white} />
            <Text style={styles.buttonText}>{isEditing ? 'Save' : 'Add task'}</Text>
          </Pressable>

          {isEditing && onCancel && (
            <Pressable accessibilityLabel="Cancel editing" onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      <TextInput
        accessibilityLabel="Task notes"
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="Add details, links, or sub-steps (optional)..."
        placeholderTextColor="#9BA6A1"
        style={styles.notesInput}
        multiline
        maxLength={500}
      />

      <View style={styles.reminderRow}>
        <Text style={styles.reminderLabel}>
          {reminderAt
            ? `Reminder: ${new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(reminderAt))}`
            : 'Schedule alarm/reminder'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderActions}>
          <Pressable accessibilityLabel="Remind me in 15 minutes" onPress={() => setReminderMinutes(15)} style={styles.reminderChip}>
            <Text style={styles.reminderChipText}>+15m</Text>
          </Pressable>
          <Pressable accessibilityLabel="Remind me in 1 hour" onPress={() => setReminderMinutes(60)} style={styles.reminderChip}>
            <Text style={styles.reminderChipText}>+1 hour</Text>
          </Pressable>
          <Pressable accessibilityLabel="Remind me tonight" onPress={setTonight} style={styles.reminderChip}>
            <Text style={styles.reminderChipText}>Tonight (9 PM)</Text>
          </Pressable>
          <Pressable accessibilityLabel="Remind me tomorrow morning" onPress={setTomorrowMorning} style={styles.reminderChip}>
            <Text style={styles.reminderChipText}>Tomorrow 9 AM</Text>
          </Pressable>
          {reminderAt && (
            <Pressable accessibilityLabel="Clear reminder" onPress={() => onReminderChange(null)} style={styles.clearReminder}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={styles.clearReminderText}>Clear</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <Text style={styles.note}>
        {isEditing ? 'Make your adjustments and hit Save to update.' : 'Keep it simple. One small step at a time.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  editingPanel: { backgroundColor: '#FDFCF9', padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: '#F2D4CD' },
  editingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  editingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: '#FDEAE6' },
  editingText: { color: colors.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cancelChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  inputRow: { gap: spacing.sm },
  inputWrap: { position: 'relative' },
  plus: { position: 'absolute', zIndex: 1, left: 16, top: 14, color: colors.coral, fontSize: 22 },
  input: { height: 54, paddingHorizontal: spacing.md, paddingLeft: 47, borderRadius: radii.sm, backgroundColor: colors.paper, color: colors.ink, fontSize: typography.body, borderWidth: 1, borderColor: colors.line },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1, height: 48, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.ink },
  saveButton: { backgroundColor: colors.coral },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  cancelButton: { minWidth: 80, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  cancelButtonText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  notesInput: { minHeight: 46, maxHeight: 100, marginTop: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, color: colors.ink, backgroundColor: colors.white, fontSize: typography.caption, textAlignVertical: 'top' },
  reminderRow: { marginTop: spacing.md, gap: spacing.xs },
  reminderLabel: { color: colors.muted, fontSize: typography.caption, fontWeight: '600' },
  reminderActions: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', paddingTop: 4 },
  reminderChip: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radii.sm, backgroundColor: colors.mint, marginRight: 6 },
  reminderChipText: { color: '#557362', fontSize: typography.label, fontWeight: '700' },
  clearReminder: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  clearReminderText: { color: colors.danger, fontSize: typography.label, fontWeight: '700' },
  note: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.caption },
});

