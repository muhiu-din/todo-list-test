import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { TaskComposer } from '@/src/features/tasks/components/TaskComposer';
import { TaskRow } from '@/src/features/tasks/components/TaskRow';
import { createPersonalTask, deletePersonalTask, ensurePersonalList, listenToPersonalTasks, updatePersonalTask, type RemoteTask } from '@/src/features/tasks/personalTaskService';
import { cancelTaskReminder, scheduleTaskReminder } from '@/src/services/notifications';
import { reconcileTaskReminders } from '@/src/services/reminderReconciler';
import { loadLocalTasks, saveLocalTasks } from '@/src/services/taskStorage';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/tokens';
import { filterTasks } from '@/src/features/tasks/taskUtils';
import type { Task, TaskFilter } from '@/src/features/tasks/types';

export function TaskHomeScreen() {
  const { user } = useAuth();
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

  useEffect(() => {
    loadLocalTasks().then((loadedTasks) => { localTasksRef.current = loadedTasks; setTasks(loadedTasks); }).catch(() => setTasks([])).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) saveLocalTasks(tasks).catch(() => undefined);
  }, [ready, tasks]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (!user) return unsubscribe;
    ensurePersonalList(user.uid).then((listId) => {
      setPersonalListId(listId);
      unsubscribe = listenToPersonalTasks(user.uid, listId, (remoteTasks) => {
        const nextTasks = remoteTasks.map((task) => toLocalTask(task));
        if (nextTasks.length === 0 && localTasksRef.current.length > 0 && !migrationShownRef.current) {
          migrationShownRef.current = true;
          setMigrationTasks(localTasksRef.current);
          setShowMigration(true);
        }
        setTasks(nextTasks);
        reconcileTaskReminders(nextTasks).then((notificationMap) => {
          setTasks((current) => current.map((task) => ({ ...task, notificationId: notificationMap[task.id] ?? null })));
        }).catch(() => undefined);
        setReady(true);
      }, () => setPersonalListId(null));
    }).catch(() => setPersonalListId(null));
    return () => unsubscribe();
  }, [user]);

  const visibleTasks = useMemo(() => filterTasks(tasks, filter).filter((task) => task.title.toLowerCase().includes(search.trim().toLowerCase())).sort((left, right) => right.createdAt - left.createdAt), [filter, search, tasks]);
  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;
  const completion = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

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

    setTasks((current) => existing ? current.map((task) => task.id === existing.id ? nextTask : task) : [nextTask, ...current]);
    if (user && personalListId) {
      const remoteTask = toFirestoreTask(nextTask, user.uid);
      if (existing) await updatePersonalTask(user.uid, personalListId, existing.id, remoteTask);
      else await createPersonalTask(user.uid, personalListId, remoteTask);
    }
    if (nextTask.reminderAt && new Date(nextTask.reminderAt) > new Date()) {
      const notificationId = await scheduleTaskReminder(nextTask.title, new Date(nextTask.reminderAt));
      setTasks((current) => current.map((task) => task.id === nextTask.id ? { ...task, notificationId } : task));
    }
    setTaskText('');
    setNotes('');
    setEditingId(null);
    setReminderAt(null);
  }

  function editTask(task: Task) {
    setEditingId(task.id);
    setTaskText(task.title);
    setNotes(task.notes ?? '');
    setReminderAt(task.reminderAt);
  }

  async function toggleTask(task: Task) {
    if (!task.completed) await cancelTaskReminder(task.notificationId);
    const nextCompleted = !task.completed;
    let notificationId: string | null = null;
    if (!nextCompleted && task.reminderAt && new Date(task.reminderAt) > new Date()) {
      notificationId = await scheduleTaskReminder(task.title, new Date(task.reminderAt));
    }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: nextCompleted, notificationId } : item));
    if (user && personalListId) await updatePersonalTask(user.uid, personalListId, task.id, { completed: nextCompleted, completedBy: nextCompleted ? user.uid : null, completedAt: nextCompleted ? Timestamp.now() : null });
  }

  async function deleteTask(task: Task) {
    await cancelTaskReminder(task.notificationId);
    setTasks((current) => current.filter((item) => item.id !== task.id));
    if (user && personalListId) await deletePersonalTask(user.uid, personalListId, task.id);
  }

  async function importLegacyTasks() {
    if (!user || !personalListId) return;
    for (const task of migrationTasks) await createPersonalTask(user.uid, personalListId, toFirestoreTask(task, user.uid));
    setShowMigration(false);
    setMigrationTasks([]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>*</Text></View><Text style={styles.brand}>daymark</Text></View>
          <Text style={styles.dateText}>{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date()).toUpperCase()}</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}><Text style={styles.eyebrow}>YOUR DAILY RHYTHM</Text><Text style={styles.title}>Make space for{`\n`}<Text style={styles.titleAccent}>what matters.</Text></Text><Text style={styles.subtitle}>A clear list for a clearer mind.</Text></View>
          <View style={styles.progressOrbit}><Text style={styles.progressNumber}>{completion}%</Text><Text style={styles.progressLabel}>COMPLETE</Text></View>
        </View>

        <View style={styles.workspace}>
          <TaskComposer value={taskText} notes={notes} isEditing={Boolean(editingId)} reminderAt={reminderAt} onChangeText={setTaskText} onChangeNotes={setNotes} onReminderChange={setReminderAt} onSubmit={submitTask} />
          <TextInput accessibilityLabel="Search tasks" value={search} onChangeText={setSearch} placeholder="Search your tasks" placeholderTextColor="#9BA6A1" style={styles.searchInput} />
          {showMigration && <View style={styles.migrationCard}><Text style={styles.migrationTitle}>Import your local tasks?</Text><Text style={styles.migrationCopy}>{migrationTasks.length} task{migrationTasks.length === 1 ? '' : 's'} found on this device.</Text><View style={styles.migrationActions}><Pressable onPress={importLegacyTasks} style={styles.importButton}><Text style={styles.importText}>Import</Text></Pressable><Pressable onPress={() => { setShowMigration(false); setMigrationTasks([]); }} style={styles.skipButton}><Text style={styles.skipText}>Skip</Text></Pressable></View></View>}
          <View style={styles.listHeader}>
            <View><Text style={styles.eyebrow}>YOUR LIST</Text><Text style={styles.sectionTitle}>Today&apos;s focus <Text style={styles.count}>{openCount}</Text></Text></View>
            <View style={styles.filters}>{(['all', 'active', 'completed'] as TaskFilter[]).map((item) => <Pressable accessibilityLabel={`Show ${item} tasks`} key={item} onPress={() => setFilter(item)} style={[styles.filterButton, filter === item && styles.filterButtonActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item === 'active' ? 'Open' : item === 'completed' ? 'Done' : 'All'}</Text></Pressable>)}</View>
          </View>

          {ready && visibleTasks.length > 0 ? visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />) : <View style={styles.emptyState}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>+</Text></View><Text style={styles.emptyTitle}>{ready ? 'Nothing here yet' : 'Loading your list'}</Text><Text style={styles.emptyCopy}>{ready ? 'Add a task above and give your day a little shape.' : 'Getting your local tasks ready.'}</Text></View>}
        </View>

        <View style={styles.footer}><Text style={styles.footerText}>DAYMARK / 01</Text><Text style={styles.footerText}>BUILT FOR THE EVERYDAY</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function toLocalTask(task: RemoteTask): Task {
  return { id: task.id, title: task.title, notes: task.notes ?? null, completed: task.completed, reminderAt: task.reminderAt?.toDate().toISOString() ?? null, notificationId: null, createdAt: task.createdAt?.toMillis() ?? Date.now() };
}

function toFirestoreTask(task: Task, uid: string) {
  return { title: task.title, notes: task.notes, completed: task.completed, completedBy: task.completed ? uid : null, completedAt: task.completed ? Timestamp.now() : null, createdBy: uid, assigneeId: null, dueAt: null, reminderAt: task.reminderAt ? Timestamp.fromDate(new Date(task.reminderAt)) : null };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: { width: 29, height: 29, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brandMarkText: { color: colors.white, fontSize: 15 },
  brand: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  dateText: { flexShrink: 1, color: colors.muted, fontSize: typography.label, fontWeight: '700', letterSpacing: 1, textAlign: 'right' },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 56, marginBottom: 40 },
  heroCopy: { flex: 1 },
  eyebrow: { marginBottom: spacing.sm, color: colors.coral, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 43, lineHeight: 44, fontWeight: '700' },
  titleAccent: { color: colors.coral },
  subtitle: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.body },
  progressOrbit: { width: 92, height: 92, marginLeft: spacing.sm, borderRadius: radii.pill, borderWidth: 5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  progressNumber: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  progressLabel: { marginTop: 2, color: colors.muted, fontSize: 7, fontWeight: '700', letterSpacing: 0.8 },
  workspace: { padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, ...shadows.card },
  searchInput: { height: 44, marginTop: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, color: colors.ink, backgroundColor: colors.paper, fontSize: typography.caption },
  migrationCard: { marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.mintStrong, borderRadius: radii.md, backgroundColor: '#F5FBF7' },
  migrationTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  migrationCopy: { marginTop: spacing.xs, color: colors.muted, fontSize: typography.caption },
  migrationActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  importButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.ink },
  importText: { color: colors.white, fontSize: typography.caption, fontWeight: '700' },
  skipButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.mint },
  skipText: { color: '#557362', fontSize: typography.caption, fontWeight: '700' },
  listHeader: { marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '700' },
  count: { color: '#62716B', backgroundColor: colors.mint, fontSize: typography.label, fontWeight: '700' },
  filters: { flexDirection: 'row', padding: spacing.xs, borderRadius: radii.sm, backgroundColor: colors.paper },
  filterButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm },
  filterButtonActive: { backgroundColor: colors.white },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.ink },
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, marginBottom: spacing.sm, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint },
  emptyIconText: { color: '#678675', fontSize: 20 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  emptyCopy: { marginTop: spacing.xs, color: colors.muted, fontSize: 12, textAlign: 'center' },
  footer: { paddingTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#9CA9A2', fontSize: 8, fontWeight: '700', letterSpacing: 1.1 },
});
