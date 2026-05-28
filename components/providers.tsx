'use client';

import { SessionProvider } from 'next-auth/react';
import { useReducer, type ReactNode } from 'react';
import { StoreContext, reducer, initialState } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <SessionProvider>
      <StoreContext.Provider value={{ state, dispatch }}>
        {children}
      </StoreContext.Provider>
    </SessionProvider>
  );
}
