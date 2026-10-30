import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { Destination } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

function parseDestinationsResponse(response: unknown): Destination[] {
  if (Array.isArray(response)) return response as Destination[];
  if (response && typeof response === 'object' && Array.isArray((response as { data?: Destination[] }).data)) {
    return (response as { data: Destination[] }).data;
  }
  if (response && typeof response === 'object' && Array.isArray((response as { destinations?: Destination[] }).destinations)) {
    return (response as { destinations: Destination[] }).destinations;
  }
  return [];
}

type DestinationsContextValue = {
  /** Get cached destinations for languageId (null if not loaded yet). */
  getCachedDestinations: (languageId: string) => Destination[] | null;
  /** Load destinations for languageId (fetches once per languageId, then uses cache). */
  loadDestinations: (languageId: string) => Promise<Destination[]>;
  /** Whether a load is in progress for the current language (for initial load). */
  loading: boolean;
};

const DestinationsContext = createContext<DestinationsContextValue | null>(null);

export function DestinationsProvider({ children }: { children: React.ReactNode }) {
  const { currentLanguage } = useTranslation();
  const [cache, setCache] = useState<Record<string, Destination[]>>({});
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<Record<string, Promise<Destination[]>>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const loadDestinations = useCallback(async (languageId: string): Promise<Destination[]> => {
    if (!languageId) return [];
    const cached = cacheRef.current[languageId];
    if (cached) return cached;
    const pending = pendingRef.current[languageId];
    if (pending) return pending;

    const promise = (async () => {
      try {
        const response = await api.getDestinations(languageId);
        const list = parseDestinationsResponse(response);
        setCache((prev) => ({ ...prev, [languageId]: list }));
        return list;
      } catch {
        return [];
      } finally {
        delete pendingRef.current[languageId];
      }
    })();
    pendingRef.current[languageId] = promise;
    return promise;
  }, []);

  const getCachedDestinations = useCallback((languageId: string): Destination[] | null => {
    if (!languageId) return null;
    const list = cache[languageId];
    return list ?? null;
  }, [cache]);

  // Single fetch on site load and when language changes: preload destinations for current language
  useEffect(() => {
    const langId = currentLanguage?.id;
    if (!langId) return;
    setLoading(true);
    loadDestinations(langId).finally(() => setLoading(false));
  }, [currentLanguage?.id, loadDestinations]); // loadDestinations is stable (empty deps)

  const value: DestinationsContextValue = {
    getCachedDestinations,
    loadDestinations,
    loading,
  };

  return (
    <DestinationsContext.Provider value={value}>
      {children}
    </DestinationsContext.Provider>
  );
}

export function useDestinations(): DestinationsContextValue {
  const ctx = useContext(DestinationsContext);
  if (!ctx) throw new Error('useDestinations must be used within DestinationsProvider');
  return ctx;
}
