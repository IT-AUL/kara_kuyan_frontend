import { AppState, type AppStateStatus } from 'react-native';

import type { SyncEngine } from '@/features/checking/sync/syncEngine';

const MAX_WAIT_MS = 5 * 60_000;

/**
 * Runs the sync engine at the moments that matter: start-up (after recovery), when the app returns to the
 * foreground, when a result is saved, and when the earliest scheduled retry falls due. The schedule itself
 * is persisted (`nextAttemptAt`); the timer is only a wake-up.
 */
export class SyncScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private subscription: { remove(): void } | null = null;
  private started = false;

  constructor(private readonly engine: SyncEngine, private readonly now: () => number = Date.now) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.engine.recover();
    this.subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void this.trigger();
    });
    await this.trigger();
  }

  stop(): void {
    this.started = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.subscription?.remove();
    this.subscription = null;
  }

  /** Sends what is due now, then re-arms the wake-up timer. */
  async trigger(): Promise<void> {
    try {
      await this.engine.runOnce();
    } finally {
      await this.rearm();
    }
  }

  private async rearm(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.started) return;
    const next = await this.engine.nextWakeAt();
    if (next === null) return;
    const delay = Math.min(MAX_WAIT_MS, Math.max(1_000, next - this.now()));
    this.timer = setTimeout(() => void this.trigger(), delay);
  }
}
