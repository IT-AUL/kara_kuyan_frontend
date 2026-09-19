/** Small synchronous JSON cache for backend data that must survive restarts (never images). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
