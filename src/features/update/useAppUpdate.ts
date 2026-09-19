import { useCallback, useEffect, useState } from 'react';

import { apkInstaller, releaseSource } from '@/composition';
import { findChecksum, planUpdate, type UpdateOffer } from '@/domain/update/release';

export type UpdateState =
  | { kind: 'none' }
  | { kind: 'available'; offer: UpdateOffer }
  | { kind: 'needs-permission'; offer: UpdateOffer }
  | { kind: 'downloading'; offer: UpdateOffer; fraction: number }
  | { kind: 'error'; offer: UpdateOffer; message: string };

/**
 * Checks GitHub Releases once per launch (release builds only) and drives download → verify → system installer.
 * Never throws: any failure leaves the app as it was (ADR 0008).
 */
export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({ kind: 'none' });

  useEffect(() => {
    if (__DEV__) return;
    let cancelled = false;
    (async () => {
      const release = await releaseSource.latest();
      if (!release || cancelled) return;
      const offer = planUpdate(release, apkInstaller.currentVersion(), await apkInstaller.supportedAbis());
      if (offer && !cancelled) setState({ kind: 'available', offer });
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async (offer: UpdateOffer) => {
    try {
      if (!(await apkInstaller.canInstall())) {
        setState({ kind: 'needs-permission', offer });
        await apkInstaller.openInstallSettings();
        return;
      }
      setState({ kind: 'downloading', offer, fraction: 0 });
      const sums = await releaseSource.text(offer.checksums.url);
      const sha = sums ? findChecksum(sums, offer.apk.name) : null;
      if (!sha) throw new Error('Не удалось получить контрольную сумму.');
      const path = await apkInstaller.download(offer.apk.url, sha, (fraction) =>
        setState({ kind: 'downloading', offer, fraction }),
      );
      await apkInstaller.install(path);
      setState({ kind: 'available', offer });
    } catch (e) {
      const mismatch = e instanceof Error && e.message.includes('checksum');
      setState({
        kind: 'error',
        offer,
        message: mismatch ? 'Файл повреждён при загрузке. Попробуйте ещё раз.' : 'Не удалось скачать обновление. Проверьте интернет.',
      });
    }
  }, []);

  const dismiss = useCallback(() => setState({ kind: 'none' }), []);
  return { state, start, dismiss };
}
