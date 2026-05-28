'use client';

import type { Metadata } from '@/types';

// Drive'daki metadata.json'u server route üzerinden okur.
export async function fetchMetadata(metadataId: string): Promise<Metadata> {
  const res = await fetch(`/api/drive/metadata?id=${metadataId}`);
  if (!res.ok) throw new Error('Metadata okunamadı');
  return res.json();
}

// Güncel metadata'yı Drive'a yazar.
export async function persistMetadata(metadataId: string, data: Metadata): Promise<void> {
  const res = await fetch('/api/drive/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadataId, data }),
  });
  if (!res.ok) throw new Error('Metadata yazılamadı');
}

export function yeniId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
