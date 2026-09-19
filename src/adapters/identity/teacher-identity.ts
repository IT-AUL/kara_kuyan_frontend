import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY = 'kk.teacher-uuid';

/**
 * The `X-Teacher-UUID` of this device. Bearer-equivalent demo identity (contract-gaps 14): kept in the
 * platform keystore, created on first use, never logged.
 */
export async function getTeacherUuid(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const fresh = Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY, fresh);
  return fresh;
}
