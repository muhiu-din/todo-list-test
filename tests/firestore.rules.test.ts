import fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, afterAll, describe, it } from 'vitest';
import { arrayRemove, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: 'daymark-rules-test',
    firestore: { rules: fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  if (testEnvironment) await testEnvironment.cleanup();
});

describe('Daymark Firestore rules', () => {
  it('allows a team member to read the team and blocks an outsider', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'teams/team-a'), { name: 'Team A', ownerId: 'owner', inviteCode: 'TEAMAA', memberIds: ['owner', 'member'] });
      await setDoc(doc(database, 'teams/team-a/members/member'), { uid: 'member', role: 'member', joinedWithCode: 'TEAMAA' });
    });

    const memberDatabase = testEnvironment.authenticatedContext('member').firestore();
    const outsiderDatabase = testEnvironment.authenticatedContext('outsider').firestore();
    await assertSucceeds(getDoc(doc(memberDatabase, 'teams/team-a')));
    await assertFails(getDoc(doc(outsiderDatabase, 'teams/team-a')));
  });

  it('allows a member to read shared tasks but blocks an outsider', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'teams/team-a/members/member'), { uid: 'member', role: 'member', joinedWithCode: 'TEAMAA' });
      await setDoc(doc(context.firestore(), 'teams/team-a/lists/list-a/tasks/task-a'), { title: 'Shared task' });
    });

    await assertSucceeds(getDoc(doc(testEnvironment.authenticatedContext('member').firestore(), 'teams/team-a/lists/list-a/tasks/task-a')));
    await assertFails(getDoc(doc(testEnvironment.authenticatedContext('outsider').firestore(), 'teams/team-a/lists/list-a/tasks/task-a')));
  });

  it('blocks a member from using an invite belonging to another team', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'teams/team-b'), { name: 'Team B', ownerId: 'owner-b', inviteCode: 'TEAMB1', memberIds: ['owner-b'] });
      await setDoc(doc(database, 'invites/TEAMB1'), { teamId: 'team-b', code: 'TEAMB1' });
    });

    const memberDatabase = testEnvironment.authenticatedContext('member').firestore();
    await assertFails(setDoc(doc(memberDatabase, 'teams/team-a/members/member'), { uid: 'member', role: 'member', joinedWithCode: 'TEAMB1' }));
  });

  it('blocks a user from reading another user personal list', async () => {
    await assertFails(getDoc(doc(testEnvironment.authenticatedContext('outsider').firestore(), 'users/member/lists/personal')));
  });

  it('allows an authenticated owner to create the team, owner member, and invite', async () => {
    const database = testEnvironment.authenticatedContext('new-owner').firestore();
    await assertSucceeds(setDoc(doc(database, 'teams/team-created'), { name: 'Created Team', ownerId: 'new-owner', inviteCode: 'NEW123', memberIds: ['new-owner'] }));
    await assertSucceeds(setDoc(doc(database, 'teams/team-created/members/new-owner'), { uid: 'new-owner', role: 'owner', joinedWithCode: '' }));
    await assertSucceeds(setDoc(doc(database, 'invites/NEW123'), { code: 'NEW123', teamId: 'team-created', createdBy: 'new-owner', active: true }));
  });

  it('allows a team member to leave by deleting member doc and removing themselves from memberIds', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'teams/team-leave'), { name: 'Leave Team', ownerId: 'owner-leave', inviteCode: 'LEV123', memberIds: ['owner-leave', 'leaving-member'] });
      await setDoc(doc(database, 'teams/team-leave/members/leaving-member'), { uid: 'leaving-member', role: 'member', joinedWithCode: 'LEV123' });
    });

    const leavingMemberDb = testEnvironment.authenticatedContext('leaving-member').firestore();
    await assertSucceeds(deleteDoc(doc(leavingMemberDb, 'teams/team-leave/members/leaving-member')));
    await assertSucceeds(updateDoc(doc(leavingMemberDb, 'teams/team-leave'), { memberIds: arrayRemove('leaving-member') }));
  });

  it('allows an owner to delete an invite when deleting the team', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(doc(database, 'teams/team-del'), { name: 'Delete Team', ownerId: 'owner-del', inviteCode: 'DEL123', memberIds: ['owner-del'] });
      await setDoc(doc(database, 'invites/DEL123'), { code: 'DEL123', teamId: 'team-del', createdBy: 'owner-del', active: true });
    });

    const ownerDb = testEnvironment.authenticatedContext('owner-del').firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'invites/DEL123')));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'teams/team-del')));
  });
});

