import { useEffect, useSyncExternalStore } from 'react';

import type { ApiResult } from '@/adapters/api/client';
import type { KeyValueStore } from '@/ports/key-value';

export type ResourceState<T> = {
  /** `loading` keeps the previous `data` (stale-while-revalidate). */
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  error: string | null;
  /** True when `data` comes from the cache and the last refresh failed. */
  offline: boolean;
};

/**
 * One backend resource: shows the cached copy immediately, refreshes from the network, keeps the last good
 * copy when the server is down. Cache entries are JSON written by this same code, never images.
 */
export class Resource<T> {
  private state: ResourceState<T>;
  private readonly listeners = new Set<() => void>();
  private inflight: Promise<void> | null = null;

  constructor(
    readonly key: string,
    private readonly fetcher: () => Promise<ApiResult<T>>,
    private readonly cache: KeyValueStore | null,
  ) {
    let cached: T | null = null;
    try {
      const raw = cache?.get(`res:${key}`);
      cached = raw ? (JSON.parse(raw) as T) : null;
    } catch {
      cached = null;
    }
    this.state = { status: cached ? 'ready' : 'idle', data: cached, error: null, offline: false };
  }

  getState = (): ResourceState<T> => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private set(next: Partial<ResourceState<T>>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  /** Overwrites the value (e.g. after a local mutation the server already accepted). */
  put(data: T) {
    this.set({ status: 'ready', data, error: null, offline: false });
    this.persist(data);
  }

  private persist(data: T) {
    try {
      this.cache?.set(`res:${this.key}`, JSON.stringify(data));
    } catch {
      // a full or unavailable cache must not break the screen
    }
  }

  refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.set({ status: 'loading' });
    this.inflight = this.fetcher()
      .then((result) => {
        if (result.ok) {
          this.set({ status: 'ready', data: result.value, error: null, offline: false });
          this.persist(result.value);
        } else {
          this.set({ status: this.state.data ? 'ready' : 'error', error: result.error.message, offline: this.state.data !== null });
        }
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}

/** Subscribes to a resource and refreshes it on mount. Pass `null` while the key is not known yet. */
export function useResource<T>(resource: Resource<T> | null): ResourceState<T> & { refresh: () => Promise<void> } {
  const empty: ResourceState<T> = { status: 'idle', data: null, error: null, offline: false };
  const state = useSyncExternalStore(
    resource ? resource.subscribe : noopSubscribe,
    resource ? resource.getState : () => empty,
    resource ? resource.getState : () => empty,
  );
  useEffect(() => {
    if (resource) void resource.refresh();
  }, [resource]);
  return { ...state, refresh: () => (resource ? resource.refresh() : Promise.resolve()) };
}

const noopSubscribe = () => () => {};
