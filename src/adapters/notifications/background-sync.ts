// Periodic headless background sync for remote announcements & GitHub Releases via Android WorkManager (ADR 0010).
// Uses `expo-background-task` + `expo-task-manager` (Expo SDK 57 replacement for deprecated `expo-background-fetch`).

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { BackgroundAnnouncementsWorker } from '@/ports/announcements';

export const ANNOUNCEMENTS_BACKGROUND_TASK = 'KK_ANNOUNCEMENTS_BACKGROUND_SYNC';

// Inexact minimum interval in minutes (Android WorkManager minimum is 15 minutes; 30 min balances freshness & battery).
const MINIMUM_INTERVAL_MINUTES = 30;

let boundExecutor: (() => Promise<boolean>) | null = null;
let registrationAttempted = false;

if (Platform.OS !== 'web') {
  try {
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
    // Non-native test runner or unsupported host environment — ignore safely.
  }
}

export const expoBackgroundAnnouncementsWorker: BackgroundAnnouncementsWorker = {
  bindExecutor(executor: () => Promise<boolean>): void {
    boundExecutor = executor;
  },

  async ensureRegistered(): Promise<void> {
    if (Platform.OS === 'web' || registrationAttempted) return;
    registrationAttempted = true;
    try {
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
      // Allow retry later if registration raced early startup
      registrationAttempted = false;
    }
  },
};
