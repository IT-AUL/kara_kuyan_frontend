// Periodic headless background sync for remote announcements & GitHub Releases via Android WorkManager (ADR 0010).
// Uses `expo-background-task` + `expo-task-manager` (Expo SDK 57 replacement for deprecated `expo-background-fetch`).
// Guards native module resolution via `requireOptionalNativeModule` so Web, Jest, and older dev-client shells never crash at import time.

import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import type { BackgroundAnnouncementsWorker } from '@/ports/announcements';

export const ANNOUNCEMENTS_BACKGROUND_TASK = 'KK_ANNOUNCEMENTS_BACKGROUND_SYNC';

// Inexact minimum interval in minutes (Android WorkManager minimum is 15 minutes; 30 min balances freshness & battery).
const MINIMUM_INTERVAL_MINUTES = 30;

type BackgroundTaskModule = typeof import('expo-background-task');
type TaskManagerModule = typeof import('expo-task-manager');

let boundExecutor: (() => Promise<boolean>) | null = null;
let registrationAttempted = false;
let bgModules: { BackgroundTask: BackgroundTaskModule; TaskManager: TaskManagerModule } | null = null;

if (Platform.OS !== 'web' && requireOptionalNativeModule('ExpoTaskManager') !== null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require('expo-background-task') as BackgroundTaskModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as TaskManagerModule;
    bgModules = { BackgroundTask, TaskManager };

    if (!TaskManager.isTaskDefined(ANNOUNCEMENTS_BACKGROUND_TASK)) {
      TaskManager.defineTask(ANNOUNCEMENTS_BACKGROUND_TASK, async ({ error }) => {
        if (error || !boundExecutor) {
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
        try {
          const ok = await boundExecutor();
          return ok
            ? BackgroundTask.BackgroundTaskResult.Success
            : BackgroundTask.BackgroundTaskResult.Failed;
        } catch {
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      });
    }
  } catch {
    bgModules = null;
  }
}

export const expoBackgroundAnnouncementsWorker: BackgroundAnnouncementsWorker = {
  bindExecutor(executor: () => Promise<boolean>): void {
    boundExecutor = executor;
  },

  async ensureRegistered(): Promise<void> {
    if (Platform.OS === 'web' || !bgModules || registrationAttempted) return;
    registrationAttempted = true;
    try {
      const { BackgroundTask, TaskManager } = bgModules;
      const status = await BackgroundTask.getStatusAsync();
      if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
      const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(
        ANNOUNCEMENTS_BACKGROUND_TASK,
      );
      if (!alreadyRegistered) {
        await BackgroundTask.registerTaskAsync(ANNOUNCEMENTS_BACKGROUND_TASK, {
          minimumInterval: MINIMUM_INTERVAL_MINUTES,
        });
      }
    } catch {
      registrationAttempted = false;
    }
  },
};
