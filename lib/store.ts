'use client';

import { createContext, useContext, type Dispatch } from 'react';
import type { Metadata, Garment, Outfit, StoredFolderIds } from '@/types';

type State = {
  folderIds: StoredFolderIds | null;
  metadata: Metadata | null;
  blobCache: Map<string, string>; // fileId -> objectURL
};

type Action =
  | { type: 'SET_FOLDER_IDS'; payload: StoredFolderIds }
  | { type: 'SET_METADATA'; payload: Metadata }
  | { type: 'ADD_GARMENT'; payload: Garment }
  | { type: 'ADD_OUTFIT'; payload: Outfit }
  | { type: 'SET_BLOB_URL'; payload: { fileId: string; url: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FOLDER_IDS':
      return { ...state, folderIds: action.payload };
    case 'SET_METADATA':
      return { ...state, metadata: action.payload };
    case 'ADD_GARMENT':
      if (!state.metadata) return state;
      return {
        ...state,
        metadata: {
          ...state.metadata,
          garments: [...state.metadata.garments, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };
    case 'ADD_OUTFIT':
      if (!state.metadata) return state;
      return {
        ...state,
        metadata: {
          ...state.metadata,
          outfits: [...state.metadata.outfits, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };
    case 'SET_BLOB_URL': {
      const next = new Map(state.blobCache);
      next.set(action.payload.fileId, action.payload.url);
      return { ...state, blobCache: next };
    }
    default:
      return state;
  }
}

const initialState: State = {
  folderIds: null,
  metadata: null,
  blobCache: new Map(),
};

export const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function useStore() {
  return useContext(StoreContext);
}

export { reducer, initialState };
export type { State, Action };
