import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { listenToUserTeams } from '@/src/features/teams/teamService';
import { listenToLists } from '@/src/features/lists/listService';
import { listenToTasks } from '@/src/features/tasks/firestoreTaskService';
import type { TaskList } from '@/src/features/lists/types';
import type { Team } from '@/src/features/teams/types';
import type { Task } from '@/src/features/tasks/types';
import { cancelScopeReminders, reconcileTaskReminders } from './reminderReconciler';

type RemoteTaskWithId = {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  reminderAt: Timestamp | null;
  createdAt: Timestamp;
};

function toLocalTask(task: RemoteTaskWithId): Task {
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

export function useTeamReminderSync(user: User | null) {
  const activeUnsubscribes = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (!user) {
      // Clean up all active listeners when logged out
      activeUnsubscribes.current.forEach((unsub) => unsub());
      activeUnsubscribes.current.clear();
      return undefined;
    }

    // Keep track of which team/list scopes exist
    const teamListSubs = new Map<string, () => void>();
    const taskSubs = new Map<string, () => void>();

    const unsubTeams = listenToUserTeams(
      user.uid,
      (teams: Team[]) => {
        const currentTeamIds = new Set(teams.map((t) => t.id));

        // Tear down listeners for teams the user is no longer in
        for (const [teamId, unsub] of teamListSubs.entries()) {
          if (!currentTeamIds.has(teamId)) {
            unsub();
            teamListSubs.delete(teamId);
          }
        }

        // For each team the user belongs to, listen to its lists
        teams.forEach((team) => {
          if (!teamListSubs.has(team.id)) {
            const listPath = `teams/${team.id}/lists`;
            const unsubLists = listenToLists(
              listPath,
              (lists: TaskList[]) => {
                const currentListScopes = new Set(lists.map((l) => `team:${team.id}:${l.id}`));

                // Clean up listeners for lists that were removed
                for (const [scopeKey, unsubTask] of taskSubs.entries()) {
                  if (scopeKey.startsWith(`team:${team.id}:`) && !currentListScopes.has(scopeKey)) {
                    unsubTask();
                    taskSubs.delete(scopeKey);
                    cancelScopeReminders(scopeKey).catch(() => undefined);
                  }
                }

                // For each list, listen to tasks and reconcile reminders
                lists.forEach((list) => {
                  const scope = `team:${team.id}:${list.id}`;
                  if (!taskSubs.has(scope)) {
                    const taskPath = `teams/${team.id}/lists/${list.id}/tasks`;
                    const unsubTask = listenToTasks(
                      taskPath,
                      (remoteTasks) => {
                        const localTasks = remoteTasks.map((t) => toLocalTask(t as unknown as RemoteTaskWithId));
                        // Reconcile reminders with team context prefix so all members receive ringing notifications
                        reconcileTaskReminders(localTasks, scope, team.name).catch(() => undefined);
                      },
                      () => undefined
                    );
                    taskSubs.set(scope, unsubTask);
                  }
                });
              },
              () => undefined
            );
            teamListSubs.set(team.id, unsubLists);
          }
        });
      },
      () => undefined
    );

    return () => {
      unsubTeams();
      teamListSubs.forEach((unsub) => unsub());
      teamListSubs.clear();
      taskSubs.forEach((unsub) => unsub());
      taskSubs.clear();
    };
  }, [user]);
}

