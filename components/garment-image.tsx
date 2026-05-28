'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '@/lib/store';
import { fetchFileBlob } from '@/lib/drive';
import { cacheBlob, getCachedBlob } from '@/lib/idb';
import type { Garment } from '@/types';

// Drive görselini access token ile fetch eder, blob → objectURL'e çevirir,
// IndexedDB'ye cacheler. Tekrar açılışlarda cache'ten gelir.
export function useGarmentImage(fileId: string | null) {
  const { data: session } = useSession();
  const { state, dispatch } = useStore();
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fileId) return;

    const memCached = state.blobCache.get(fileId);
    if (memCached) {
      setImgUrl(memCached);
      return;
    }

    const idbBlob = await getCachedBlob(fileId);
    if (idbBlob) {
      const url = URL.createObjectURL(idbBlob);
      dispatch({ type: 'SET_BLOB_URL', payload: { fileId, url } });
      setImgUrl(url);
      return;
    }

    if (!session?.accessToken) return;
    try {
      const blob = await fetchFileBlob(fileId, session.accessToken);
      await cacheBlob(fileId, blob);
      const url = URL.createObjectURL(blob);
      dispatch({ type: 'SET_BLOB_URL', payload: { fileId, url } });
      setImgUrl(url);
    } catch {
      // sessiz hata
    }
  }, [fileId, session, state.blobCache, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  return imgUrl;
}

export function GarmentImage({
  garment,
  className = 'h-full w-full object-contain',
}: {
  garment: Garment;
  className?: string;
}) {
  const fileId = garment.driveIsoId ?? garment.driveOrigId;
  const imgUrl = useGarmentImage(fileId);

  if (!imgUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--murekkep)] opacity-20" />
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={`${garment.altKategori} — ${garment.renkler.join(', ')}`}
      className={className}
    />
  );
}
