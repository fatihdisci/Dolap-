import type { Metadata } from '@/types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'Dolap Stilisti';
const METADATA_FILE_NAME = 'metadata.json';

type FolderIds = {
  root: string;
  orijinal: string;
  izole: string;
  metadataId: string;
};

// ------------------------------------------------------------------ helpers
async function driveGet(path: string, token: string) {
  const res = await fetch(`${DRIVE_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive GET ${path} → ${res.status}`);
  return res.json();
}

async function findFile(
  name: string,
  parentId: string | null,
  mimeType: string,
  token: string,
): Promise<string | null> {
  const q = [
    `name = '${name}'`,
    `mimeType = '${mimeType}'`,
    `trashed = false`,
    parentId ? `'${parentId}' in parents` : null,
  ]
    .filter(Boolean)
    .join(' and ');

  const data = await driveGet(`/files?q=${encodeURIComponent(q)}&fields=files(id)`, token);
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId: string | null, token: string): Promise<string> {
  const meta = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {}),
  };
  const res = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meta),
  });
  if (!res.ok) throw new Error(`Drive createFolder ${name} → ${res.status}`);
  const data = await res.json();
  return data.id;
}

// ------------------------------------------------------------------ setup
export async function setupDriveFolders(token: string): Promise<FolderIds> {
  // Root folder
  let rootId = await findFile(APP_FOLDER_NAME, null, 'application/vnd.google-apps.folder', token);
  if (!rootId) rootId = await createFolder(APP_FOLDER_NAME, null, token);

  // Sub-folders
  let orijinalId = await findFile('orijinal', rootId, 'application/vnd.google-apps.folder', token);
  if (!orijinalId) orijinalId = await createFolder('orijinal', rootId, token);

  let izoleId = await findFile('izole', rootId, 'application/vnd.google-apps.folder', token);
  if (!izoleId) izoleId = await createFolder('izole', rootId, token);

  // metadata.json
  let metadataId = await findFile(METADATA_FILE_NAME, rootId, 'application/json', token);
  if (!metadataId) {
    const empty: Metadata = { garments: [], outfits: [], updatedAt: new Date().toISOString() };
    metadataId = await uploadJson(METADATA_FILE_NAME, rootId, empty, token);
  }

  return { root: rootId, orijinal: orijinalId, izole: izoleId, metadataId };
}

// ------------------------------------------------------------------ metadata
export async function readMetadata(metadataId: string, token: string): Promise<Metadata> {
  const res = await fetch(`${DRIVE_API}/files/${metadataId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive readMetadata → ${res.status}`);
  return res.json();
}

export async function writeMetadata(
  metadataId: string,
  data: Metadata,
  token: string,
): Promise<void> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const res = await fetch(`${UPLOAD_API}/files/${metadataId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: blob,
  });
  if (!res.ok) throw new Error(`Drive writeMetadata → ${res.status}`);
}

async function uploadJson(
  name: string,
  parentId: string,
  data: object,
  token: string,
): Promise<string> {
  const metadata = JSON.stringify({ name, parents: [parentId] });
  const content = JSON.stringify(data);

  const form = new FormData();
  form.append('metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive uploadJson ${name} → ${res.status}`);
  const result = await res.json();
  return result.id;
}

// ------------------------------------------------------------------ file upload
export async function uploadFile(
  name: string,
  parentId: string,
  blob: Blob,
  mimeType: string,
  token: string,
): Promise<string> {
  const metadata = JSON.stringify({ name, parents: [parentId] });

  const form = new FormData();
  form.append('metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('file', blob, name);

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive uploadFile ${name} → ${res.status}`);
  const result = await res.json();
  return result.id;
}

// ------------------------------------------------------------------ file read (for client blob cache)
export async function fetchFileBlob(fileId: string, token: string): Promise<Blob> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive fetchFile ${fileId} → ${res.status}`);
  return res.blob();
}

