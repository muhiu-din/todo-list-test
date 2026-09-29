import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { createTeam, joinTeamByCode, leaveTeam, listenToTeamMembers, listenToUserTeams } from '@/src/features/teams/teamService';
import type { Team, TeamMember } from '@/src/features/teams/types';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export default function TeamsScreen() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return listenToUserTeams(user.uid, setTeams, (error) => setMessage(error.message));
  }, [user]);

  useEffect(() => {
    if (!selectedTeam) return undefined;
    return listenToTeamMembers(selectedTeam.id, setMembers, (error) => setMessage(error.message));
  }, [selectedTeam]);

  async function handleCreate() {
    if (!user || !teamName.trim()) return setMessage('Enter a team name.');
    setBusy(true);
    try {
      await createTeam(user.uid, teamName);
      setTeamName('');
      setMessage('Team created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create team.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!user || inviteCode.trim().length !== 6) return setMessage('Enter a 6-character invite code.');
    setBusy(true);
    try {
      await joinTeamByCode(user.uid, inviteCode);
      setInviteCode('');
      setMessage('You joined the team.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not join team.');
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite(team: Team) {
    await Share.share({ message: `Join my Daymark team "${team.name}" with invite code ${team.inviteCode}.` });
  }

  async function handleLeave() {
    if (!user || !selectedTeam || selectedTeam.ownerId === user.uid) return setMessage('The owner cannot leave their own team.');
    await leaveTeam(selectedTeam.id, user.uid);
    setSelectedTeam(null);
    setMessage('You left the team.');
  }

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.eyebrow}>COLLABORATION</Text>
    <Text style={styles.title}>Teams</Text>
    <Text style={styles.subtitle}>Share a list, keep the rhythm together.</Text>
    <View style={styles.formCard}><Text style={styles.cardTitle}>Create a team</Text><View style={styles.formRow}><TextInput accessibilityLabel="Team name" value={teamName} onChangeText={setTeamName} placeholder="Team name" placeholderTextColor="#9BA6A1" style={styles.input} /><Pressable accessibilityLabel="Create team" onPress={handleCreate} disabled={busy} style={styles.primaryButton}><Text style={styles.primaryText}>Create</Text></Pressable></View></View>
    <View style={styles.formCard}><Text style={styles.cardTitle}>Join with a code</Text><View style={styles.formRow}><TextInput accessibilityLabel="Invite code" value={inviteCode} onChangeText={(value) => setInviteCode(value.toUpperCase())} placeholder="ABC123" placeholderTextColor="#9BA6A1" autoCapitalize="characters" maxLength={6} style={styles.input} /><Pressable accessibilityLabel="Join team" onPress={handleJoin} disabled={busy} style={styles.primaryButton}><Text style={styles.primaryText}>Join</Text></Pressable></View></View>
    {message && <Text style={styles.message}>{message}</Text>}
    <Text style={styles.sectionLabel}>YOUR TEAMS</Text>
    {teams.length === 0 ? <View style={styles.empty}><Ionicons name="people-outline" size={26} color={colors.muted} /><Text style={styles.emptyTitle}>No teams yet</Text><Text style={styles.emptyCopy}>Create one above or join with an invite code.</Text></View> : teams.map((team) => <Pressable key={team.id} onPress={() => setSelectedTeam(team)} style={[styles.teamCard, selectedTeam?.id === team.id && styles.teamCardSelected]}><View style={styles.teamIcon}><Ionicons name="people" size={19} color={colors.coral} /></View><View style={styles.teamCopy}><Text style={styles.teamName}>{team.name}</Text><Text style={styles.teamMeta}>Invite code · {team.inviteCode}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>)}
    {selectedTeam && <View style={styles.detailCard}><View style={styles.detailHeader}><View><Text style={styles.cardTitle}>{selectedTeam.name}</Text><Text style={styles.teamMeta}>{members.length} member{members.length === 1 ? '' : 's'}</Text></View><Pressable accessibilityLabel="Share invite" onPress={() => shareInvite(selectedTeam)} style={styles.shareButton}><Ionicons name="share-outline" size={17} color={colors.white} /><Text style={styles.shareText}>Share invite</Text></Pressable></View><View style={styles.codeBox}><Text style={styles.codeLabel}>INVITE CODE</Text><Text style={styles.code}>{selectedTeam.inviteCode}</Text></View>{members.map((member) => <View key={member.uid} style={styles.memberRow}><View style={styles.memberAvatar}><Text style={styles.memberInitial}>{member.displayName?.slice(0, 1).toUpperCase() || '?'}</Text></View><Text style={styles.memberName}>{member.displayName || member.uid}</Text><Text style={styles.role}>{member.role}</Text></View>)}{selectedTeam.ownerId !== user?.uid && <Pressable onPress={handleLeave} style={styles.leaveButton}><Text style={styles.leaveText}>Leave team</Text></Pressable>}</View>}
  </ScrollView>;
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
  shareButton: { paddingHorizontal: spacing.sm, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.sm, backgroundColor: colors.ink },
  shareText: { color: colors.white, fontSize: typography.label, fontWeight: '700' },
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
});
