import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { TaskComposer } from '@/src/features/tasks/components/TaskComposer';
import { TaskRow } from '@/src/features/tasks/components/TaskRow';
import {
  createPersonalTask,
  deletePersonalTask,
  ensurePersonalList,
  listenToPersonalTasks,
  updatePersonalTask,
  type RemoteTask,
} from '@/src/features/tasks/personalTaskService';
import { cancelTaskReminder } from '@/src/services/notifications';
import { reconcileTaskReminders } from '@/src/services/reminderReconciler';
import { loadLocalTasks, saveLocalTasks } from '@/src/services/taskStorage';
import { radii, shadows, spacing, typography } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';
import { filterTasks } from '@/src/features/tasks/taskUtils';
import type { Task, TaskFilter } from '@/src/features/tasks/types';

export function TaskHomeScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [personalListId, setPersonalListId] = useState<string | null>(null);
  const [taskText, setTaskText] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showMigration, setShowMigration] = useState(false);
  const [migrationTasks, setMigrationTasks] = useState<Task[]>([]);
  const localTasksRef = useRef<Task[]>([]);
  const migrationShownRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Top inset to ensure the logo NEVER overlaps the phone notification bar
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0) + 14;

  useEffect(() => {
    loadLocalTasks()
      .then((loadedTasks) => {
        localTasksRef.current = loadedTasks;
        setTasks(loadedTasks);
        reconcileTaskReminders(loadedTasks, 'personal').catch(() => undefined);
      })
      .catch(() => setTasks([]))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) saveLocalTasks(tasks).catch(() => undefined);
  }, [ready, tasks]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (!user) return unsubscribe;

    ensurePersonalList(user.uid)
      .then((listId) => {
        setPersonalListId(listId);
        unsubscribe = listenToPersonalTasks(
          user.uid,
          listId,
          (remoteTasks) => {
            const nextTasks = remoteTasks.map((task) => toLocalTask(task));
            if (nextTasks.length === 0 && localTasksRef.current.length > 0 && !migrationShownRef.current) {
              migrationShownRef.current = true;
              setMigrationTasks(localTasksRef.current);
              setShowMigration(true);
            }
            setTasks(nextTasks);
            reconcileTaskReminders(nextTasks, 'personal')
              .then((notificationMap) => {
                setTasks((current) =>
                  current.map((task) => ({ ...task, notificationId: notificationMap[task.id] ?? null }))
                );
              })
              .catch(() => undefined);
            setReady(true);
          },
          () => setPersonalListId(null)
        );
      })
      .catch(() => setPersonalListId(null));

    return () => unsubscribe();
  }, [user]);

  const visibleTasks = useMemo(
    () =>
      filterTasks(tasks, filter)
        .filter((task) => task.title.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((left, right) => right.createdAt - left.createdAt),
    [filter, search, tasks]
  );

  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;
  const completion = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  function cancelEdit() {
    setEditingId(null);
    setTaskText('');
    setNotes('');
    setReminderAt(null);
  }

  async function submitTask() {
    const title = taskText.trim();
    if (!title) return;

    const existing = editingId ? tasks.find((task) => task.id === editingId) : undefined;
    if (existing) await cancelTaskReminder(existing.notificationId);

    const nextTask: Task = {
      id: existing?.id ?? Date.now().toString(),
      title,
      notes: notes.trim() || null,
      completed: existing?.completed ?? false,
      reminderAt,
      notificationId: null,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    const updatedTasks = existing
      ? tasks.map((task) => (task.id === existing.id ? nextTask : task))
      : [nextTask, ...tasks];

    setTasks(updatedTasks);
    cancelEdit();

    try {
      if (user && personalListId) {
        const remoteTask = toFirestoreTask(nextTask, user.uid);
        if (existing) {
          try {
            await updatePersonalTask(user.uid, personalListId, existing.id, remoteTask);
          } catch {
            await createPersonalTask(user.uid, personalListId, remoteTask);
          }
        } else {
          await createPersonalTask(user.uid, personalListId, remoteTask);
        }
      } else {
        // Offline / local tasks
        reconcileTaskReminders(updatedTasks, 'personal').catch(() => undefined);
      }
    } catch (error) {
      console.warn('Failed to persist task:', error);
    }
  }

  function editTask(task: Task) {
    setEditingId(task.id);
    setTaskText(task.title);
    setNotes(task.notes ?? '');
    setReminderAt(task.reminderAt);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function toggleTask(task: Task) {
    if (!task.completed) await cancelTaskReminder(task.notificationId);
    const nextCompleted = !task.completed;

    const updatedTasks = tasks.map((item) =>
      item.id === task.id ? { ...item, completed: nextCompleted, notificationId: nextCompleted ? null : item.notificationId } : item
    );
    setTasks(updatedTasks);

    if (user && personalListId) {
      await updatePersonalTask(user.uid, personalListId, task.id, {
        completed: nextCompleted,
        completedBy: nextCompleted ? user.uid : null,
        completedAt: nextCompleted ? Timestamp.now() : null,
      });
    } else {
      reconcileTaskReminders(updatedTasks, 'personal').catch(() => undefined);
    }
  }

  async function deleteTask(task: Task) {
    await cancelTaskReminder(task.notificationId);
    if (editingId === task.id) cancelEdit();
    const updatedTasks = tasks.filter((item) => item.id !== task.id);
    setTasks(updatedTasks);

    if (user && personalListId) {
      await deletePersonalTask(user.uid, personalListId, task.id);
    } else {
      reconcileTaskReminders(updatedTasks, 'personal').catch(() => undefined);
    }
  }

  async function importLegacyTasks() {
    if (!user || !personalListId) return;
    for (const task of migrationTasks) {
      await createPersonalTask(user.uid, personalListId, toFirestoreTask(task, user.uid));
    }
    setShowMigration(false);
    setMigrationTasks([]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.paper}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, { paddingTop: topInset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View style={styles.brandRow}>
            <View style={[styles.brandMark, { backgroundColor: colors.ink }]}>
              <Text style={[styles.brandMarkText, { color: colors.card }]}>*</Text>
            </View>
            <Text style={[styles.brand, { color: colors.ink }]}>daymark</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.muted }]}>
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
              .format(new Date())
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={[styles.eyebrow, { color: colors.coral }]}>YOUR DAILY RHYTHM</Text>
            <Text style={[styles.title, { color: colors.ink }]}>
              Make space for{`\n`}
              <Text style={[styles.titleAccent, { color: colors.coral }]}>what matters.</Text>
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>A clear list for a clearer mind.</Text>
          </View>
          <View style={[styles.progressOrbit, { borderColor: colors.line, backgroundColor: colors.card }]}>
            <Text style={[styles.progressNumber, { color: colors.ink }]}>{completion}%</Text>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>COMPLETE</Text>
          </View>
        </View>

        <View
          style={[
            styles.workspace,
            {
              backgroundColor: colors.card,
              borderColor: colors.line,
            },
          ]}
        >
          <TaskComposer
            value={taskText}
            notes={notes}
            isEditing={Boolean(editingId)}
            reminderAt={reminderAt}
            onChangeText={setTaskText}
            onChangeNotes={setNotes}
            onReminderChange={setReminderAt}
            onSubmit={submitTask}
            onCancel={cancelEdit}
          />

          <TextInput
            accessibilityLabel="Search tasks"
            value={search}
            onChangeText={setSearch}
            placeholder="Search your tasks"
            placeholderTextColor={colors.muted}
            style={[
              styles.searchInput,
              {
                borderColor: colors.line,
                color: colors.ink,
                backgroundColor: colors.paper,
              },
            ]}
          />

          {showMigration && (
            <View
              style={[
                styles.migrationCard,
                {
                  borderColor: colors.mintStrong,
                  backgroundColor: colors.mint,
                },
              ]}
            >
              <Text style={[styles.migrationTitle, { color: colors.ink }]}>Import your local tasks?</Text>
              <Text style={[styles.migrationCopy, { color: colors.mintText }]}>
                {migrationTasks.length} task{migrationTasks.length === 1 ? '' : 's'} found on this device.
              </Text>
              <View style={styles.migrationActions}>
                <Pressable
                  onPress={importLegacyTasks}
                  style={[styles.importButton, { backgroundColor: colors.ink }]}
                >
                  <Text style={[styles.importText, { color: colors.white }]}>Import</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowMigration(false);
                    setMigrationTasks([]);
                  }}
                  style={[styles.skipButton, { backgroundColor: colors.card, borderColor: colors.line }]}
                >
                  <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.listHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.coral }]}>YOUR LIST</Text>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                Today&apos;s focus{' '}
                <Text style={[styles.count, { backgroundColor: colors.mint, color: colors.mintText }]}>
                  {openCount}
                </Text>
              </Text>
            </View>
            <View style={[styles.filters, { backgroundColor: colors.paper }]}>
              {(['all', 'active', 'completed'] as TaskFilter[]).map((item) => (
                <Pressable
                  accessibilityLabel={`Show ${item} tasks`}
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterButton,
                    filter === item && [styles.filterButtonActive, { backgroundColor: colors.card }],
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.muted },
                      filter === item && [styles.filterTextActive, { color: colors.ink }],
                    ]}
                  >
                    {item === 'active' ? 'Open' : item === 'completed' ? 'Done' : 'All'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {ready && visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isEditing={editingId === task.id}
                onToggle={toggleTask}
                onEdit={editTask}
                onDelete={deleteTask}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.mint }]}>
                <Text style={[styles.emptyIconText, { color: colors.mintText }]}>+</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>
                {ready ? 'Nothing here yet' : 'Loading your list'}
              </Text>
              <Text style={[styles.emptyCopy, { color: colors.muted }]}>
                {ready
                  ? 'Add a task above and give your day a little shape.'
                  : 'Getting your local tasks ready.'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>DAYMARK / 01</Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>BUILT FOR THE EVERYDAY</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function toLocalTask(task: RemoteTask): Task {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes ?? null,
    completed: task.completed,
    reminderAt: task.reminderAt?.toDate().toISOString() ?? null,
    notificationId: null,
    createdAt: task.createdAt?.toMillis() ?? Date.now(),
  };
}

function toFirestoreTask(task: Task, uid: string) {
  return {
    title: task.title,
    notes: task.notes,
    completed: task.completed,
    completedBy: task.completed ? uid : null,
    completedAt: task.completed ? Timestamp.now() : null,
    createdBy: uid,
    assigneeId: null,
    dueAt: null,
    reminderAt: task.reminderAt ? Timestamp.fromDate(new Date(task.reminderAt)) : null,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontSize: 16, fontWeight: '700' },
  brand: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  dateText: {
    flexShrink: 1,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'right',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 32,
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    marginBottom: spacing.xs,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: { fontSize: 36, lineHeight: 40, fontWeight: '800' },
  titleAccent: {},
  subtitle: { marginTop: spacing.sm, fontSize: typography.body },
  progressOrbit: {
    width: 88,
    height: 88,
    marginLeft: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: { fontSize: 18, fontWeight: '700' },
  progressLabel: { marginTop: 2, fontSize: 7, fontWeight: '700', letterSpacing: 0.8 },
  workspace: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  searchInput: {
    height: 44,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.sm,
    fontSize: typography.caption,
  },
  migrationCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  migrationTitle: { fontSize: typography.body, fontWeight: '700' },
  migrationCopy: { marginTop: spacing.xs, fontSize: typography.caption },
  migrationActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  importButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  importText: { fontSize: typography.caption, fontWeight: '700' },
  skipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  skipText: { fontSize: typography.caption, fontWeight: '700' },
  listHeader: { marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  sectionTitle: { fontSize: typography.section, fontWeight: '700' },
  count: {
    fontSize: typography.label,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  filters: { flexDirection: 'row', padding: spacing.xs, borderRadius: radii.sm },
  filterButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm },
  filterButtonActive: {},
  filterText: { fontSize: 12, fontWeight: '600' },
  filterTextActive: { fontWeight: '700' },
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyIcon: {
    width: 44,
    height: 44,
    marginBottom: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { fontSize: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyCopy: { marginTop: spacing.xs, fontSize: 12, textAlign: 'center' },
  footer: { paddingTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, fontWeight: '700', letterSpacing: 1.1 },
});
