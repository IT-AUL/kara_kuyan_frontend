// The single composition root: the only place adapters are wired to the ports the features use (ADR 0002).
import * as Crypto from 'expo-crypto';

import { CameraPreview } from '@/adapters/ocr-native/CameraPreview';
import { nativeOcrEngine } from '@/adapters/ocr-native/engine';
import { githubReleases } from '@/adapters/app-updater/github-releases';
import { nativeInstaller } from '@/adapters/app-updater/native-installer';
import { ApiClient } from '@/adapters/api/client';
import { BackendApi } from '@/adapters/api/backend';
import { getTeacherUuid } from '@/adapters/identity/teacher-identity';
import { openDb } from '@/adapters/sqlite/db';
import { SqliteKeyValueStore } from '@/adapters/sqlite/kv-store';
import { SqliteStore } from '@/adapters/sqlite/sqlite-store';
import { FakeGateway } from '@/adapters/sync/fake-gateway';
import { HttpGateway } from '@/adapters/sync/http-gateway';
import { SyncScheduler } from '@/adapters/sync/scheduler';
import { SyncEngine } from '@/features/checking/sync/syncEngine';
import type { ApkInstaller, ReleaseSource } from '@/ports/app-updater';
import type { KeyValueStore } from '@/ports/key-value';
import type { OcrEngine } from '@/ports/ocr-engine';
import type { SyncGateway } from '@/ports/sync-gateway';

export const ocrEngine: OcrEngine = nativeOcrEngine;
export { CameraPreview };

export const newUuid = (): string => Crypto.randomUUID();

const { db } = openDb();
export const submissionStore = new SqliteStore(db);

export const kvStore: KeyValueStore = new SqliteKeyValueStore(db);

/**
 * Backend target: the live server by default. `EXPO_PUBLIC_API_URL` overrides it; the value `fake` selects the
 * in-memory fake backend (lab and offline development only, nothing leaves the phone).
 * `EXPO_PUBLIC_TEACHER_UUID` overrides the keystore identity.
 */
const DEFAULT_API_URL = 'https://tatar-ocr.duckdns.org';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_SYNC_URL ?? DEFAULT_API_URL;
const useFake = apiUrl === 'fake';
const apiClient = useFake
  ? null
  : new ApiClient({ baseUrl: apiUrl, teacherUuid: async () => process.env.EXPO_PUBLIC_TEACHER_UUID ?? getTeacherUuid() });
export const backendApi: BackendApi | null = apiClient ? new BackendApi(apiClient) : null;
export const fakeGateway: FakeGateway | null = apiClient ? null : new FakeGateway();
const gateway: SyncGateway = fakeGateway ?? new HttpGateway(apiClient!);

export const syncEngine = new SyncEngine({ store: submissionStore, gateway, clock: { now: Date.now } });
export const syncScheduler = new SyncScheduler(syncEngine);

// Self-update from GitHub Releases (ADR 0008).
export const releaseSource: ReleaseSource = githubReleases;
export const apkInstaller: ApkInstaller = nativeInstaller;
