// The single composition root: the only place adapters are wired to the ports the features use (ADR 0002).
import * as Crypto from 'expo-crypto';

import { CameraPreview } from '@/adapters/ocr-native/CameraPreview';
import { nativeOcrEngine } from '@/adapters/ocr-native/engine';
import { ApiClient } from '@/adapters/api/client';
import { BackendApi } from '@/adapters/api/backend';
import { getTeacherUuid } from '@/adapters/identity/teacher-identity';
import { openDb } from '@/adapters/sqlite/db';
import { SqliteStore } from '@/adapters/sqlite/sqlite-store';
import { FakeGateway } from '@/adapters/sync/fake-gateway';
import { HttpGateway } from '@/adapters/sync/http-gateway';
import { SyncScheduler } from '@/adapters/sync/scheduler';
import { demoBundles } from '@/demo/demo-bundle';
import { SyncEngine } from '@/features/checking/sync/syncEngine';
import type { OcrEngine } from '@/ports/ocr-engine';
import type { SyncGateway } from '@/ports/sync-gateway';

export const ocrEngine: OcrEngine = nativeOcrEngine;
export const offlineBundles = demoBundles; // until a bundle store adapter exists (slice 3)
export { CameraPreview };

export const newUuid = (): string => Crypto.randomUUID();

const { db } = openDb();
export const submissionStore = new SqliteStore(db);

/**
 * Backend target. Without `EXPO_PUBLIC_API_URL` a fake backend is used (no network, nothing leaves the
 * phone); set the variable to opt in to the real server. `EXPO_PUBLIC_TEACHER_UUID` overrides the keystore identity.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_SYNC_URL;
const apiClient = apiUrl
  ? new ApiClient({ baseUrl: apiUrl, teacherUuid: async () => process.env.EXPO_PUBLIC_TEACHER_UUID ?? getTeacherUuid() })
  : null;
export const backendApi: BackendApi | null = apiClient ? new BackendApi(apiClient) : null;
export const fakeGateway: FakeGateway | null = apiClient ? null : new FakeGateway();
const gateway: SyncGateway = fakeGateway ?? new HttpGateway(apiClient!);

export const syncEngine = new SyncEngine({ store: submissionStore, gateway, clock: { now: Date.now } });
export const syncScheduler = new SyncScheduler(syncEngine);
