'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '@/lib/store';

export function AppInit() {
  const { data: session, status } = useSession();
  const { dispatch, state } = useStore();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) return;
    if (state.folderIds) return; // already initialized

    async function init() {
      try {
        // Setup Drive folders (idempotent)
        const res = await fetch('/api/drive/setup', { method: 'POST' });
        if (!res.ok) return;
        const ids = await res.json();
        dispatch({ type: 'SET_FOLDER_IDS', payload: ids });

        // Load metadata
        const mRes = await fetch(`/api/drive/metadata?id=${ids.metadataId}`);
        if (!mRes.ok) return;
        const metadata = await mRes.json();
        dispatch({ type: 'SET_METADATA', payload: metadata });
      } catch (err) {
        console.error('AppInit error:', err);
      }
    }

    init();
  }, [status, session, state.folderIds, dispatch]);

  return null;
}
