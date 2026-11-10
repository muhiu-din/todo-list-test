import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthProvider';
import {
  createTeam,
  deleteTeam,
  joinTeamByCode,
  leaveTeam,
  listenToTeamMembers,
  listenToUserTeams,
  regenerateInvite,
  removeMember,
} from '@/src/features/teams/teamService';
import { createList, listenToLists } from '@/src/features/lists/listService';
import type { TaskList } from '@/src/features/lists/types';
import type { Team, TeamMember } from '@/src/features/teams/types';
import { TaskComposer } from '@/src/features/tasks/components/TaskComposer';
import { TaskRow } from '@/src/features/tasks/components/TaskRow';
import { createTask, deleteTask, listenToTasks, updateTask } from '@/src/features/tasks/firestoreTaskService';
import type { Task } from '@/src/features/tasks/types';
import { reconcileTaskReminders } from '@/src/services/reminderReconciler';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';

export default function TeamsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0) + 14;

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [listName, setListName] = useState('');
  const [selectedList, setSelectedList] = useState<TaskList | null>(null);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
  const [taskText, setTaskText] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [sharedReminderAt, setSharedReminderAt] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [busyAction, setBusyAction] = useState<'create' | 'join' | 'list' | 'delete' | 'leave' | null>(null);

  useEffect(() => {
    if (!user) return undefined;
    return listenToUserTeams(user.uid, setTeams, (error) => setMessage(error.message));
  }, [user]);

  useEffect(() => {
    if (!selectedTeam) return undefined;
    return listenToTeamMembers(selectedTeam.id, setMembers, (error) => setMessage(error.message));
  }, [selectedTeam]);

  useEffect(() => {
    if (!selectedTeam || !selectedList) return undefined;
    const path = `teams/${selectedTeam.id}/lists/${selectedList.id}/tasks`;
    const scope = `team:${selectedTeam.id}:${selectedList.id}`;
    return listenToTasks(
      path,
      (remoteTasks) => {
        const nextTasks = remoteTasks.map(toLocalTask);
        setSharedTasks(nextTasks);
        reconcileTaskReminders(nextTasks, scope, selectedTeam.name).catch(() => undefined);
      },
      (error) => setMessage(error.message)
    );
  }, [selectedList, selectedTeam]);

  useEffect(() => {
    if (!selectedTeam) return undefined;
    return listenToLists(`teams/${selectedTeam.id}/lists`, setLists, (error) => setMessage(error.message));
  }, [selectedTeam]);

  async function handleCreate() {
    if (!user) return setMessage('Please sign in again before creating a team.');
    if (!teamName.trim()) return setMessage('Enter a team name.');
    setBusyAction('create');
    setMessage('Creating team...');
    try {
      await createTeam(user.uid, teamName);
      setTeamName('');
      setMessage('Team created. Your team will appear below.');
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not create team.'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleJoin() {
    if (!user || inviteCode.trim().length !== 6) return setMessage('Enter a 6-character invite code.');
    setBusyAction('join');
    try {
      await joinTeamByCode(user.uid, inviteCode);
      setInviteCode('');
      setMessage('You joined the team.');
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not join team.'));
    } finally {
      setBusyAction(null);
    }
  }

  async function shareInvite(team: Team) {
    await Share.share({ message: `Join my Daymark team "${team.name}" with invite code ${team.inviteCode}.` });
  }

  async function handleLeave() {
    if (!user || !selectedTeam) return;
    if (selectedTeam.ownerId === user.uid) {
      return setMessage('The owner cannot leave their own team. You can delete it instead.');
    }

    const doLeave = async () => {
      setBusyAction('leave');
      try {
        await leaveTeam(selectedTeam.id, user.uid);
        setSelectedTeam(null);
        setSelectedList(null);
        setMessage('You left the team.');
      } catch (error) {
        setMessage(formatTeamError(error, 'Could not leave team.'));
      } finally {
        setBusyAction(null);
      }
    };

    if (Platform.OS === 'web') {
      await doLeave();
    } else {
      Alert.alert('Leave team?', `Are you sure you want to leave "${selectedTeam.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => void doLeave() },
      ]);
    }
  }

  async function handleRegenerateInvite() {
    if (!user || !selectedTeam || selectedTeam.ownerId !== user.uid) return;
    try {
      const nextCode = await regenerateInvite(selectedTeam.id, selectedTeam.inviteCode, user.uid);
      setSelectedTeam({ ...selectedTeam, inviteCode: nextCode });
      setMessage('Invite code regenerated.');
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not regenerate invite code.'));
    }
  }

  async function handleDeleteTeam() {
    if (!selectedTeam || selectedTeam.ownerId !== user?.uid) return;
    const remove = () => {
      setBusyAction('delete');
      deleteTeam(selectedTeam.id, selectedTeam.inviteCode)
        .then(() => {
          setSelectedTeam(null);
          setSelectedList(null);
          setMessage('Team deleted.');
        })
        .catch((error) => setMessage(formatTeamError(error, 'Could not delete team.')))
        .finally(() => setBusyAction(null));
    };
    if (Platform.OS === 'web') remove();
    else Alert.alert('Delete team?', 'This removes the team and its invite.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove }]);
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!user || !selectedTeam || selectedTeam.ownerId !== user.uid || member.uid === user.uid) return;
    const doRemove = async () => {
      try {
        await removeMember(selectedTeam.id, member.uid);
        setMessage(`${member.displayName || 'Member'} removed from the team.`);
      } catch (error) {
        setMessage(formatTeamError(error, 'Could not remove member.'));
      }
    };

    if (Platform.OS === 'web') {
      await doRemove();
    } else {
      Alert.alert('Remove member?', `Remove ${member.displayName || 'this member'} from the team?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void doRemove() },
      ]);
    }
  }

  async function handleCreateList() {
    if (!user || !selectedTeam || !listName.trim()) return setMessage('Enter a list name.');
    setBusyAction('list');
    try {
      await createList(`teams/${selectedTeam.id}/lists`, listName, user.uid, 'team', selectedTeam.id);
      setListName('');
      setMessage('Shared list created.');
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not create shared list.'));
    } finally {
      setBusyAction(null);
    }
  }

  function cancelSharedEdit() {
    setEditingTaskId(null);
    setTaskText('');
    setSharedNotes('');
    setSharedReminderAt(null);
  }

  async function submitSharedTask() {
    if (!user || !selectedTeam || !selectedList || !taskText.trim()) return;
    const path = `teams/${selectedTeam.id}/lists/${selectedList.id}/tasks`;
    const reminderAt = sharedReminderAt ? Timestamp.fromDate(new Date(sharedReminderAt)) : null;
    const currentNotes = sharedNotes.trim() || null;

    try {
      if (editingTaskId) {
        await updateTask(path, editingTaskId, { title: taskText.trim(), notes: currentNotes, reminderAt });
        setMessage('Task updated.');
      } else {
        await createTask(path, {
          title: taskText.trim(),
          notes: currentNotes,
          completed: false,
          completedBy: null,
          completedAt: null,
          createdBy: user.uid,
          assigneeId: null,
          dueAt: null,
          reminderAt,
        });
        setMessage('Task added. Team members will receive reminders on their devices.');
      }
      cancelSharedEdit();
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not save task.'));
    }
  }

  async function toggleSharedTask(task: Task) {
    if (!user || !selectedTeam || !selectedList) return;
    try {
      await updateTask(`teams/${selectedTeam.id}/lists/${selectedList.id}/tasks`, task.id, {
        completed: !task.completed,
        completedBy: !task.completed ? user.uid : null,
        completedAt: !task.completed ? Timestamp.now() : null,
      });
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not update task status.'));
    }
  }

  async function deleteSharedTask(task: Task) {
    if (!selectedTeam || !selectedList) return;
    if (editingTaskId === task.id) cancelSharedEdit();
    try {
      await deleteTask(`teams/${selectedTeam.id}/lists/${selectedList.id}/tasks`, task.id);
    } catch (error) {
      setMessage(formatTeamError(error, 'Could not delete task.'));
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper, paddingTop: topInset }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.coral }]}>COLLABORATION</Text>
      <Text style={[styles.title, { color: colors.ink }]}>Teams</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Share a list, keep the rhythm together. Reminders ring for all members.
      </Text>

      <View style={[styles.formCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>Create a team</Text>
        <View style={styles.formRow}>
          <TextInput
            accessibilityLabel="Team name"
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Team name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.paper }]}
          />
          <Pressable
            accessibilityLabel="Create team"
            onPress={handleCreate}
            disabled={busyAction !== null}
            style={[styles.primaryButton, { backgroundColor: colors.ink }, busyAction === 'create' && styles.disabledButton]}
          >
            <Text style={[styles.primaryText, { color: colors.card }]}>{busyAction === 'create' ? 'Creating...' : 'Create'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.formCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>Join with a code</Text>
        <View style={styles.formRow}>
          <TextInput
            accessibilityLabel="Invite code"
            value={inviteCode}
            onChangeText={(value) => setInviteCode(value.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            maxLength={6}
            style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.paper }]}
          />
          <Pressable
            accessibilityLabel="Join team"
            onPress={handleJoin}
            disabled={busyAction !== null}
            style={[styles.primaryButton, { backgroundColor: colors.ink }, busyAction === 'join' && styles.disabledButton]}
          >
            <Text style={[styles.primaryText, { color: colors.card }]}>{busyAction === 'join' ? 'Joining...' : 'Join'}</Text>
          </Pressable>
        </View>
      </View>

      {message ? <Text style={[styles.message, { color: colors.muted }]}>{message}</Text> : null}

      {selectedTeam?.ownerId === user?.uid && (
        <Pressable
          accessibilityLabel="Delete team"
          onPress={handleDeleteTeam}
          disabled={busyAction === 'delete'}
          style={[styles.deleteTeamButton, { borderColor: colors.line, backgroundColor: colors.dangerBg }, busyAction === 'delete' && styles.disabledButton]}
        >
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
          <Text style={[styles.deleteTeamText, { color: colors.danger }]}>
            {busyAction === 'delete' ? 'Deleting team...' : 'Delete selected team'}
          </Text>
        </Pressable>
      )}

      <Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR TEAMS</Text>
      {teams.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.line, backgroundColor: colors.card }]}>
          <Ionicons name="people-outline" size={26} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>No teams yet</Text>
          <Text style={[styles.emptyCopy, { color: colors.muted }]}>Create one above or join with an invite code.</Text>
        </View>
      ) : (
        teams.map((team) => (
          <Pressable
            key={team.id}
            onPress={() => {
              setSelectedTeam(team);
              setSelectedList(null);
              cancelSharedEdit();
            }}
            style={[
              styles.teamCard,
              { borderColor: colors.line, backgroundColor: colors.card },
              selectedTeam?.id === team.id && [styles.teamCardSelected, { borderColor: colors.coral }],
            ]}
          >
            <View style={[styles.teamIcon, { backgroundColor: colors.coralMuted }]}>
              <Ionicons name="people" size={19} color={colors.coral} />
            </View>
            <View style={styles.teamCopy}>
              <Text style={[styles.teamName, { color: colors.ink }]}>{team.name}</Text>
              <Text style={[styles.teamMeta, { color: colors.muted }]}>Invite code · {team.inviteCode}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))
      )}

      {selectedTeam && (
        <View style={[styles.detailCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>{selectedTeam.name}</Text>
              <Text style={[styles.teamMeta, { color: colors.muted }]}>
                {members.length} member{members.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Share invite"
                onPress={() => shareInvite(selectedTeam)}
                style={[styles.shareButton, { backgroundColor: colors.ink }]}
              >
                <Ionicons name="share-outline" size={17} color={colors.white} />
                <Text style={[styles.shareText, { color: colors.white }]}>Share</Text>
              </Pressable>
              {selectedTeam.ownerId === user?.uid && (
                <Pressable
                  accessibilityLabel="Regenerate invite code"
                  onPress={handleRegenerateInvite}
                  style={[styles.regenerateButton, { backgroundColor: colors.mint }]}
                >
                  <Ionicons name="refresh" size={17} color={colors.mintText} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={[styles.codeBox, { backgroundColor: colors.mint }]}>
            <Text style={[styles.codeLabel, { color: colors.mintText }]}>INVITE CODE</Text>
            <Text style={[styles.code, { color: colors.ink }]}>{selectedTeam.inviteCode}</Text>
          </View>

          {members.map((member) => (
            <View key={member.uid} style={[styles.memberRow, { borderBottomColor: colors.line }]}>
              <View style={[styles.memberAvatar, { backgroundColor: colors.mint }]}>
                <Text style={[styles.memberInitial, { color: colors.mintText }]}>
                  {member.displayName?.slice(0, 1).toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={[styles.memberName, { color: colors.ink }]}>{member.displayName || member.uid}</Text>
              <Text style={[styles.role, { color: colors.muted }]}>{member.role}</Text>
              {selectedTeam.ownerId === user?.uid && member.uid !== user.uid && (
                <Pressable
                  accessibilityLabel={`Remove ${member.displayName || 'member'}`}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))}

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SHARED LISTS</Text>
          <View style={styles.formRow}>
            <TextInput
              accessibilityLabel="Shared list name"
              value={listName}
              onChangeText={setListName}
              placeholder="List name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.paper }]}
            />
            <Pressable
              accessibilityLabel="Create shared list"
              onPress={handleCreateList}
              disabled={busyAction === 'list'}
              style={[styles.primaryButton, { backgroundColor: colors.ink }, busyAction === 'list' && styles.disabledButton]}
            >
              <Text style={[styles.primaryText, { color: colors.card }]}>{busyAction === 'list' ? 'Adding...' : 'Add'}</Text>
            </Pressable>
          </View>

          {lists.length === 0 ? (
            <Text style={[styles.emptyList, { color: colors.muted }]}>No shared lists yet.</Text>
          ) : (
            lists.map((list) => (
              <Pressable
                key={list.id}
                onPress={() => {
                  setSelectedList(list);
                  cancelSharedEdit();
                }}
                style={[
                  styles.listCard,
                  { borderColor: colors.line, backgroundColor: colors.paper },
                  selectedList?.id === list.id && [styles.listCardSelected, { borderColor: colors.coral }],
                ]}
              >
                <Ionicons name="list-outline" size={18} color={colors.coral} />
                <Text style={[styles.listName, { color: colors.ink }]}>{list.name}</Text>
                <Text style={[styles.listMeta, { color: colors.muted }]}>Shared</Text>
              </Pressable>
            ))
          )}

          {selectedList && (
            <View style={styles.sharedTasks}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>{selectedList.name.toUpperCase()}</Text>
              <TaskComposer
                value={taskText}
                notes={sharedNotes}
                isEditing={Boolean(editingTaskId)}
                reminderAt={sharedReminderAt}
                onChangeText={setTaskText}
                onChangeNotes={setSharedNotes}
                onReminderChange={setSharedReminderAt}
                onSubmit={submitSharedTask}
                onCancel={cancelSharedEdit}
              />
              {sharedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isEditing={editingTaskId === task.id}
                  onToggle={toggleSharedTask}
                  onEdit={(item) => {
                    setEditingTaskId(item.id);
                    setTaskText(item.title);
                    setSharedNotes(item.notes ?? '');
                    setSharedReminderAt(item.reminderAt);
                  }}
                  onDelete={deleteSharedTask}
                />
              ))}
            </View>
          )}

          {selectedTeam.ownerId !== user?.uid && (
            <Pressable
              onPress={handleLeave}
              disabled={busyAction === 'leave'}
              style={[styles.leaveButton, busyAction === 'leave' && styles.disabledButton]}
            >
              <Text style={[styles.leaveText, { color: colors.danger }]}>
                {busyAction === 'leave' ? 'Leaving team...' : 'Leave team'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function formatTeamError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (
    message.toLowerCase().includes('permission-denied') ||
    message.toLowerCase().includes('missing or insufficient permissions')
  ) {
    return 'Firebase denied this action. Deploy firestore.rules and firestore.indexes.json, then restart the app.';
  }
  return message || fallback;
}

function toLocalTask(task: {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  reminderAt: Timestamp | null;
  createdAt: Timestamp;
}): Task {
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

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl },
  eyebrow: { fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, fontSize: 34, fontWeight: '800' },
  subtitle: { marginTop: spacing.sm, fontSize: typography.body },
  formCard: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderRadius: radii.md },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  formRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: { flex: 1, height: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radii.sm },
  primaryButton: { minWidth: 72, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  primaryText: { fontSize: typography.caption, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  deleteTeamButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  deleteTeamText: { fontSize: typography.caption, fontWeight: '700' },
  message: { marginTop: spacing.sm, fontSize: typography.caption },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.5 },
  teamCard: { minHeight: 70, marginBottom: spacing.sm, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md },
  teamCardSelected: {},
  teamIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  teamCopy: { flex: 1, marginHorizontal: spacing.md },
  teamName: { fontSize: typography.body, fontWeight: '700' },
  teamMeta: { marginTop: 3, fontSize: typography.caption },
  empty: { padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderRadius: radii.md },
  emptyTitle: { marginTop: spacing.sm, fontSize: 16, fontWeight: '700' },
  emptyCopy: { marginTop: spacing.xs, fontSize: typography.caption, textAlign: 'center' },
  detailCard: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderRadius: radii.md },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shareButton: { paddingHorizontal: spacing.sm, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.sm },
  shareText: { fontSize: typography.label, fontWeight: '700' },
  regenerateButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  codeBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.sm },
  codeLabel: { fontSize: typography.label, fontWeight: '700', letterSpacing: 1.2 },
  code: { marginTop: 4, fontSize: 24, fontWeight: '800', letterSpacing: 3 },
  memberRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1 },
  memberAvatar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  memberInitial: { fontSize: 12, fontWeight: '800' },
  memberName: { flex: 1, fontSize: typography.caption, fontWeight: '600' },
  role: { fontSize: typography.label, textTransform: 'capitalize' },
  leaveButton: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  leaveText: { fontSize: typography.caption, fontWeight: '700' },
  emptyList: { marginTop: spacing.sm, fontSize: typography.caption },
  listCard: { minHeight: 48, marginTop: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.sm },
  listCardSelected: {},
  sharedTasks: { marginTop: spacing.md },
  listName: { flex: 1, fontSize: typography.caption, fontWeight: '700' },
  listMeta: { fontSize: typography.label },
});
