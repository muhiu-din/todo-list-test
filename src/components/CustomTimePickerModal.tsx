import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';

type CustomTimePickerModalProps = {
  visible: boolean;
  initialDate?: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
};

export function CustomTimePickerModal({
  visible,
  initialDate,
  onConfirm,
  onClose,
}: CustomTimePickerModalProps) {
  const { colors, isDark } = useTheme();

  // Default to 1 hour from now, rounded to next 5 minutes
  const getDefaultDate = () => {
    const base = initialDate && initialDate.getTime() > Date.now() ? new Date(initialDate) : new Date(Date.now() + 60 * 60 * 1000);
    base.setSeconds(0, 0);
    const mins = base.getMinutes();
    base.setMinutes(Math.ceil(mins / 5) * 5);
    return base;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultDate);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Android Native Picker flow
  const openAndroidPicker = (mode: 'date' | 'time') => {
    try {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode,
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, newDate?: Date) => {
          if (event.type === 'set' && newDate) {
            if (mode === 'date') {
              const updated = new Date(selectedDate);
              updated.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
              setSelectedDate(updated);
              // Open time picker immediately after date is chosen
              setTimeout(() => openAndroidPicker('time'), 100);
            } else {
              const updated = new Date(selectedDate);
              updated.setHours(newDate.getHours(), newDate.getMinutes(), 0, 0);
              setSelectedDate(updated);
            }
            setErrorMessage('');
          }
        },
      });
    } catch (err) {
      console.warn('Native picker error:', err);
    }
  };

  const setRelativeMinutes = (mins: number) => {
    const next = new Date(Date.now() + mins * 60 * 1000);
    setSelectedDate(next);
    setErrorMessage('');
  };

  const setSpecificHour = (daysOffset: number, targetHour: number, targetMinute = 0) => {
    const next = new Date();
    next.setDate(next.getDate() + daysOffset);
    next.setHours(targetHour, targetMinute, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    setSelectedDate(next);
    setErrorMessage('');
  };

  const handleConfirm = () => {
    if (selectedDate.getTime() <= Date.now() + 1000) {
      setErrorMessage('Please select a time in the future.');
      return;
    }
    onConfirm(selectedDate);
    onClose();
  };

  const formatDatePreview = (d: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  };

  const getTimeRemaining = (d: Date) => {
    const diffMs = d.getTime() - Date.now();
    if (diffMs <= 0) return 'In the past';
    const totalMinutes = Math.round(diffMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `in ${mins}m`;
    if (mins === 0) return `in ${hours}h`;
    return `in ${hours}h ${mins}m`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.iconCircle, { backgroundColor: colors.coralMuted }]}>
                <Ionicons name="alarm-outline" size={18} color={colors.coral} />
              </View>
              <Text style={[styles.dialogTitle, { color: colors.ink }]}>Set Reminder Time</Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Live selected time banner */}
            <View style={[styles.previewCard, { backgroundColor: colors.paper, borderColor: colors.line }]}>
              <Text style={[styles.previewLabel, { color: colors.muted }]}>REMINDER SCHEDULED FOR</Text>
              <Text style={[styles.previewTime, { color: colors.coral }]}>{formatDatePreview(selectedDate)}</Text>
              <Text style={[styles.previewRelative, { color: colors.muted }]}>
                Rings {getTimeRemaining(selectedDate)}
              </Text>
            </View>

            {errorMessage ? <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text> : null}

            {/* Native Date & Time picker launcher (Android/iOS) */}
            {Platform.OS === 'android' && (
              <View style={styles.nativePickersRow}>
                <Pressable
                  onPress={() => openAndroidPicker('date')}
                  style={[styles.pickerLaunchBtn, { borderColor: colors.line, backgroundColor: colors.paper }]}
                >
                  <Ionicons name="calendar-outline" size={17} color={colors.coral} />
                  <Text style={[styles.pickerLaunchText, { color: colors.ink }]}>Pick Date</Text>
                </Pressable>
                <Pressable
                  onPress={() => openAndroidPicker('time')}
                  style={[styles.pickerLaunchBtn, { borderColor: colors.line, backgroundColor: colors.paper }]}
                >
                  <Ionicons name="time-outline" size={17} color={colors.coral} />
                  <Text style={[styles.pickerLaunchText, { color: colors.ink }]}>Pick Time</Text>
                </Pressable>
              </View>
            )}

            {Platform.OS === 'ios' && (
              <View style={styles.iosPickerWrap}>
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  display="spinner"
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_e, d) => {
                    if (d) {
                      setSelectedDate(d);
                      setErrorMessage('');
                    }
                  }}
                />
              </View>
            )}

            {Platform.OS === 'web' && (
              <View style={[styles.webInputWrap, { borderColor: colors.line }]}>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Custom Date & Time:</Text>
                <input
                  type="datetime-local"
                  value={new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => {
                    if (e.target.value) {
                      const parsed = new Date(e.target.value);
                      if (!isNaN(parsed.getTime())) {
                        setSelectedDate(parsed);
                        setErrorMessage('');
                      }
                    }
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${colors.line}`,
                    backgroundColor: colors.inputBg,
                    color: colors.ink,
                    fontSize: 14,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </View>
            )}

            {/* Quick Presets */}
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              <Pressable
                onPress={() => setRelativeMinutes(15)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>+15 min</Text>
              </Pressable>
              <Pressable
                onPress={() => setRelativeMinutes(30)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>+30 min</Text>
              </Pressable>
              <Pressable
                onPress={() => setRelativeMinutes(60)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>+1 hour</Text>
              </Pressable>
              <Pressable
                onPress={() => setRelativeMinutes(180)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>+3 hours</Text>
              </Pressable>
              <Pressable
                onPress={() => setSpecificHour(0, 20, 0)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>Tonight (8 PM)</Text>
              </Pressable>
              <Pressable
                onPress={() => setSpecificHour(1, 9, 0)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>Tomorrow (9 AM)</Text>
              </Pressable>
              <Pressable
                onPress={() => setSpecificHour(1, 14, 0)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>Tomorrow (2 PM)</Text>
              </Pressable>
              <Pressable
                onPress={() => setSpecificHour(2, 9, 0)}
                style={[styles.presetChip, { backgroundColor: colors.mint }]}
              >
                <Text style={[styles.presetChipText, { color: colors.mintText }]}>In 2 Days</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: colors.line, backgroundColor: colors.paper }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: colors.coral }]}
            >
              <Ionicons name="checkmark" size={17} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Set Reminder</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  previewCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  previewRelative: {
    marginTop: 4,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  errorText: {
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  nativePickersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pickerLaunchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  pickerLaunchText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  iosPickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  webInputWrap: {
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  presetChipText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.5,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.sm,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: '700',
  },
});

