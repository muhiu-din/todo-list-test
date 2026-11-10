import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';
import { CustomTimePickerModal } from '@/src/components/CustomTimePickerModal';

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
  const { colors, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

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
    <View
      style={[
        styles.panel,
        { borderBottomColor: colors.line },
        isEditing && [
          styles.editingPanel,
          {
            backgroundColor: isDark ? '#232D29' : '#FDFCF9',
            borderColor: colors.coral,
          },
        ],
      ]}
    >
      {isEditing && (
        <View style={styles.editingBanner}>
          <View style={[styles.editingBadge, { backgroundColor: colors.coralMuted }]}>
            <Ionicons name="pencil" size={13} color={colors.coral} />
            <Text style={[styles.editingText, { color: colors.coral }]}>EDITING TASK</Text>
          </View>
          {onCancel && (
            <Pressable accessibilityLabel="Cancel editing" onPress={onCancel} style={styles.cancelChip}>
              <Ionicons name="close" size={14} color={colors.danger} />
              <Text style={[styles.cancelText, { color: colors.danger }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <Text style={[styles.plus, { color: colors.coral }]}>{isEditing ? '✎' : '+'}</Text>
          <TextInput
            ref={inputRef}
            accessibilityLabel={isEditing ? 'Update task title' : 'New task title'}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={isEditing ? 'Edit task title' : 'What needs your attention?'}
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.ink,
                borderColor: colors.line,
              },
            ]}
            maxLength={120}
          />
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            accessibilityLabel={isEditing ? 'Save changes' : 'Add task'}
            onPress={onSubmit}
            style={[
              styles.button,
              { backgroundColor: colors.ink },
              isEditing && { backgroundColor: colors.coral },
            ]}
          >
            <Ionicons name={isEditing ? 'checkmark' : 'arrow-forward'} size={17} color={colors.white} />
            <Text style={[styles.buttonText, { color: colors.white }]}>{isEditing ? 'Save' : 'Add task'}</Text>
          </Pressable>

          {isEditing && onCancel && (
            <Pressable
              accessibilityLabel="Cancel editing"
              onPress={onCancel}
              style={[styles.cancelButton, { borderColor: colors.line, backgroundColor: colors.paper }]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      <TextInput
        accessibilityLabel="Task notes"
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="Add details, links, or sub-steps (optional)..."
        placeholderTextColor={colors.muted}
        style={[
          styles.notesInput,
          {
            borderColor: colors.line,
            color: colors.ink,
            backgroundColor: colors.card,
          },
        ]}
        multiline
        maxLength={500}
      />

      <View style={styles.reminderRow}>
        <View style={styles.reminderHeaderRow}>
          <Text style={[styles.reminderLabel, { color: colors.muted }]}>
            {reminderAt
              ? `Reminder: ${new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(new Date(reminderAt))}`
              : 'Schedule alarm/reminder'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderActions}>
          <Pressable
            accessibilityLabel="Set custom time"
            onPress={() => setShowCustomPicker(true)}
            style={[styles.reminderChip, styles.customChip, { backgroundColor: colors.coralMuted, borderColor: colors.coral }]}
          >
            <Ionicons name="calendar" size={13} color={colors.coral} />
            <Text style={[styles.reminderChipText, { color: colors.coral }]}>Custom Time...</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Remind me in 15 minutes"
            onPress={() => setReminderMinutes(15)}
            style={[styles.reminderChip, { backgroundColor: colors.mint }]}
          >
            <Text style={[styles.reminderChipText, { color: colors.mintText }]}>+15m</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Remind me in 1 hour"
            onPress={() => setReminderMinutes(60)}
            style={[styles.reminderChip, { backgroundColor: colors.mint }]}
          >
            <Text style={[styles.reminderChipText, { color: colors.mintText }]}>+1 hour</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Remind me tonight"
            onPress={setTonight}
            style={[styles.reminderChip, { backgroundColor: colors.mint }]}
          >
            <Text style={[styles.reminderChipText, { color: colors.mintText }]}>Tonight (9 PM)</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Remind me tomorrow morning"
            onPress={setTomorrowMorning}
            style={[styles.reminderChip, { backgroundColor: colors.mint }]}
          >
            <Text style={[styles.reminderChipText, { color: colors.mintText }]}>Tomorrow 9 AM</Text>
          </Pressable>
          {reminderAt && (
            <Pressable accessibilityLabel="Clear reminder" onPress={() => onReminderChange(null)} style={styles.clearReminder}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={[styles.clearReminderText, { color: colors.danger }]}>Clear</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <Text style={[styles.note, { color: colors.muted }]}>
        {isEditing ? 'Make your adjustments and hit Save to update.' : 'Keep it simple. One small step at a time.'}
      </Text>

      <CustomTimePickerModal
        visible={showCustomPicker}
        initialDate={reminderAt ? new Date(reminderAt) : undefined}
        onConfirm={(date) => onReminderChange(date.toISOString())}
        onClose={() => setShowCustomPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingBottom: spacing.lg, borderBottomWidth: 1 },
  editingPanel: { padding: spacing.sm, borderRadius: radii.md, borderWidth: 1 },
  editingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  editingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill },
  editingText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cancelChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  cancelText: { fontSize: 12, fontWeight: '600' },
  inputRow: { gap: spacing.sm },
  inputWrap: { position: 'relative' },
  plus: { position: 'absolute', zIndex: 1, left: 16, top: 14, fontSize: 22 },
  input: { height: 54, paddingHorizontal: spacing.md, paddingLeft: 47, borderRadius: radii.sm, fontSize: typography.body, borderWidth: 1 },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1, height: 48, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonText: { fontSize: 14, fontWeight: '700' },
  cancelButton: { minWidth: 80, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelButtonText: { fontSize: 13, fontWeight: '600' },
  notesInput: { minHeight: 46, maxHeight: 100, marginTop: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: radii.sm, fontSize: typography.caption, textAlignVertical: 'top' },
  reminderRow: { marginTop: spacing.md, gap: spacing.xs },
  reminderHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderLabel: { fontSize: typography.caption, fontWeight: '600' },
  reminderActions: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', paddingTop: 4 },
  reminderChip: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radii.sm, marginRight: 6 },
  customChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  reminderChipText: { fontSize: typography.label, fontWeight: '700' },
  clearReminder: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  clearReminderText: { fontSize: typography.label, fontWeight: '700' },
  note: { marginTop: spacing.sm, fontSize: typography.caption },
});
