// Hand-written response guards for the documented fields of the live OpenAPI (contract: openapi-live-2026-09-19.json).
// They throw on a wrong shape; `ApiClient.request` turns that into an `invalid` error.

export type Json = Record<string, unknown>;

export function obj(v: unknown, what: string): Json {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`${what}: expected object`);
  return v as Json;
}
export function arr(v: unknown, what: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${what}: expected array`);
  return v;
}
export function str(v: unknown, what: string): string {
  if (typeof v !== 'string') throw new Error(`${what}: expected string`);
  return v;
}
export function num(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${what}: expected number`);
  return v;
}
