import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { createTeam, deleteTeam, joinTeamByCode, leaveTeam, listenToTeamMembers, listenToUserTeams, regenerateInvite, removeMember } from '@/src/features/teams/teamService';
import { createList, listenToLists } from '@/src/features/lists/listService';
import type { TaskList } from '@/src/features/lists/types';
import type { Team, TeamMember } from '@/src/features/teams/types';
import { TaskComposer } from '@/src/features/tasks/components/TaskComposer';
import { TaskRow } from '@/src/features/tasks/components/TaskRow';
import { createTask, deleteTask, listenToTasks, updateTask } from '@/src/features/tasks/firestoreTaskService';
import type { Task } from '@/src/features/tasks/types';
import { reconcileTaskReminders } from '@/src/services/reminderReconciler';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export default function TeamsScreen() {
  const { user } = useAuth();
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
    return listenToTasks(path, (remoteTasks) => {
      const nextTasks = remoteTasks.map(toLocalTask);
      setSharedTasks(nextTasks);
      reconcileTaskReminders(nextTasks).catch(() => undefined);
    }, (error) => setMessage(error.message));
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
        setMessage('Task added.');
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>COLLABORATION</Text>
      <Text style={styles.title}>Teams</Text>
      <Text style={styles.subtitle}>Share a list, keep the rhythm together.</Text>

      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Create a team</Text>
        <View style={styles.formRow}>
          <TextInput accessibilityLabel="Team name" value={teamName} onChangeText={setTeamName} placeholder="Team name" placeholderTextColor="#9BA6A1" style={styles.input} />
          <Pressable accessibilityLabel="Create team" onPress={handleCreate} disabled={busyAction !== null} style={[styles.primaryButton, busyAction === 'create' && styles.disabledButton]}>
            <Text style={styles.primaryText}>{busyAction === 'create' ? 'Creating...' : 'Create'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Join with a code</Text>
        <View style={styles.formRow}>
          <TextInput accessibilityLabel="Invite code" value={inviteCode} onChangeText={(value) => setInviteCode(value.toUpperCase())} placeholder="ABC123" placeholderTextColor="#9BA6A1" autoCapitalize="characters" maxLength={6} style={styles.input} />
          <Pressable accessibilityLabel="Join team" onPress={handleJoin} disabled={busyAction !== null} style={[styles.primaryButton, busyAction === 'join' && styles.disabledButton]}>
            <Text style={styles.primaryText}>{busyAction === 'join' ? 'Joining...' : 'Join'}</Text>
          </Pressable>
        </View>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {selectedTeam?.ownerId === user?.uid && (
        <Pressable accessibilityLabel="Delete team" onPress={handleDeleteTeam} disabled={busyAction === 'delete'} style={[styles.deleteTeamButton, busyAction === 'delete' && styles.disabledButton]}>
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
          <Text style={styles.deleteTeamText}>{busyAction === 'delete' ? 'Deleting team...' : 'Delete selected team'}</Text>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>YOUR TEAMS</Text>
      {teams.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={26} color={colors.muted} />
          <Text style={styles.emptyTitle}>No teams yet</Text>
          <Text style={styles.emptyCopy}>Create one above or join with an invite code.</Text>
        </View>
      ) : (
        teams.map((team) => (
          <Pressable key={team.id} onPress={() => { setSelectedTeam(team); setSelectedList(null); cancelSharedEdit(); }} style={[styles.teamCard, selectedTeam?.id === team.id && styles.teamCardSelected]}>
            <View style={styles.teamIcon}><Ionicons name="people" size={19} color={colors.coral} /></View>
            <View style={styles.teamCopy}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamMeta}>Invite code · {team.inviteCode}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))
      )}

      {selectedTeam && (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.cardTitle}>{selectedTeam.name}</Text>
              <Text style={styles.teamMeta}>{members.length} member{members.length === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable accessibilityLabel="Share invite" onPress={() => shareInvite(selectedTeam)} style={styles.shareButton}>
                <Ionicons name="share-outline" size={17} color={colors.white} />
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
              {selectedTeam.ownerId === user?.uid && (
                <Pressable accessibilityLabel="Regenerate invite code" onPress={handleRegenerateInvite} style={styles.regenerateButton}>
                  <Ionicons name="refresh" size={17} color={colors.ink} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={styles.code}>{selectedTeam.inviteCode}</Text>
          </View>

          {members.map((member) => (
            <View key={member.uid} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>{member.displayName?.slice(0, 1).toUpperCase() || '?'}</Text>
              </View>
              <Text style={styles.memberName}>{member.displayName || member.uid}</Text>
              <Text style={styles.role}>{member.role}</Text>
              {selectedTeam.ownerId === user?.uid && member.uid !== user.uid && (
                <Pressable accessibilityLabel={`Remove ${member.displayName || 'member'}`} onPress={() => handleRemoveMember(member)}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))}

          <Text style={styles.sectionLabel}>SHARED LISTS</Text>
          <View style={styles.formRow}>
            <TextInput accessibilityLabel="Shared list name" value={listName} onChangeText={setListName} placeholder="List name" placeholderTextColor="#9BA6A1" style={styles.input} />
            <Pressable accessibilityLabel="Create shared list" onPress={handleCreateList} disabled={busyAction === 'list'} style={[styles.primaryButton, busyAction === 'list' && styles.disabledButton]}>
              <Text style={styles.primaryText}>{busyAction === 'list' ? 'Adding...' : 'Add'}</Text>
            </Pressable>
          </View>

          {lists.length === 0 ? (
            <Text style={styles.emptyList}>No shared lists yet.</Text>
          ) : (
            lists.map((list) => (
              <Pressable key={list.id} onPress={() => { setSelectedList(list); cancelSharedEdit(); }} style={[styles.listCard, selectedList?.id === list.id && styles.listCardSelected]}>
                <Ionicons name="list-outline" size={18} color={colors.coral} />
                <Text style={styles.listName}>{list.name}</Text>
                <Text style={styles.listMeta}>Shared</Text>
              </Pressable>
            ))
          )}

          {selectedList && (
            <View style={styles.sharedTasks}>
              <Text style={styles.sectionLabel}>{selectedList.name.toUpperCase()}</Text>
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
            <Pressable onPress={handleLeave} disabled={busyAction === 'leave'} style={[styles.leaveButton, busyAction === 'leave' && styles.disabledButton]}>
              <Text style={styles.leaveText}>{busyAction === 'leave' ? 'Leaving team...' : 'Leave team'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );

}

function formatTeamError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (message.toLowerCase().includes('permission-denied') || message.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Firebase denied this action. Deploy firestore.rules and firestore.indexes.json, then restart the app.';
  }
  return message || fallback;
}

function toLocalTask(task: { id: string; title: string; notes: string | null; completed: boolean; reminderAt: Timestamp | null; createdAt: Timestamp }) : Task {
  return { id: task.id, title: task.title, notes: task.notes ?? null, completed: task.completed, reminderAt: task.reminderAt?.toDate().toISOString() ?? null, notificationId: null, createdAt: task.createdAt?.toMillis() ?? Date.now() };
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, backgroundColor: colors.paper },
  eyebrow: { color: colors.coral, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.ink, fontSize: 34, fontWeight: '700' },
  subtitle: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.body },
  formCard: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  formRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: { flex: 1, height: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, color: colors.ink, backgroundColor: colors.paper },
  primaryButton: { minWidth: 72, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.ink },
  primaryText: { color: colors.white, fontSize: typography.caption, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  deleteTeamButton: { marginTop: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#F1C8C1', borderRadius: radii.sm, backgroundColor: '#FFF8F6' },
  deleteTeamText: { color: colors.danger, fontSize: typography.caption, fontWeight: '700' },
  message: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.caption },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.muted, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.5 },
  teamCard: { minHeight: 70, marginBottom: spacing.sm, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  teamCardSelected: { borderColor: colors.coral },
  teamIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: '#FBE9E5' },
  teamCopy: { flex: 1, marginHorizontal: spacing.md },
  teamName: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  teamMeta: { marginTop: 3, color: colors.muted, fontSize: typography.caption },
  empty: { padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  emptyTitle: { marginTop: spacing.sm, color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyCopy: { marginTop: spacing.xs, color: colors.muted, fontSize: typography.caption, textAlign: 'center' },
  detailCard: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shareButton: { paddingHorizontal: spacing.sm, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.sm, backgroundColor: colors.ink },
  shareText: { color: colors.white, fontSize: typography.label, fontWeight: '700' },
  regenerateButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.mint },
  codeBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.sm, backgroundColor: colors.mint },
  codeLabel: { color: '#557362', fontSize: typography.label, fontWeight: '700', letterSpacing: 1.2 },
  code: { marginTop: 4, color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: 3 },
  memberRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  memberAvatar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.mint },
  memberInitial: { color: '#557362', fontSize: 12, fontWeight: '800' },
  memberName: { flex: 1, color: colors.ink, fontSize: typography.caption, fontWeight: '600' },
  role: { color: colors.muted, fontSize: typography.label, textTransform: 'capitalize' },
  leaveButton: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  leaveText: { color: colors.danger, fontSize: typography.caption, fontWeight: '700' },
  emptyList: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.caption },
  listCard: { minHeight: 48, marginTop: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm },
  listCardSelected: { borderColor: colors.coral },
  sharedTasks: { marginTop: spacing.md },
  listName: { flex: 1, color: colors.ink, fontSize: typography.caption, fontWeight: '700' },
  listMeta: { color: colors.muted, fontSize: typography.label },
});
