import fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, afterAll, describe, it } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: 'daymark-rules-test',
    firestore: { rules: fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
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
});
