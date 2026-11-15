import { useState, useEffect, useRef, useCallback } from 'react';
import {
  POSCatalogSearchManager,
  CatalogSearchState,
  CatalogFetcher,
} from '@/services/pos/POSCatalogSearchManager';

export interface UseCatalogSearchOptions {
  debounceMs?: number;
  initialQuery?: string;
  initialCategoryId?: string | null;
}

/**
 * useCatalogSearch
 *
 * React hook that binds POSCatalogSearchManager to component lifecycle.
 * Manages request sequencing, debounce, instant clear, and unmount safety.
 */
export function useCatalogSearch(
  fetcher: CatalogFetcher,
  options?: UseCatalogSearchOptions
) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const managerRef = useRef<POSCatalogSearchManager | null>(null);

  const [state, setState] = useState<CatalogSearchState>(() => {
    const mgr = new POSCatalogSearchManager({
      fetcher: (q, c) => fetcherRef.current(q, c),
      debounceMs: options?.debounceMs ?? 250,
      initialQuery: options?.initialQuery,
      initialCategoryId: options?.initialCategoryId,
      onStateChange: (newState) => {
        setState({ ...newState });
      },
    });
    managerRef.current = mgr;
    return mgr.getState();
  });

  // Keep fetcher updated in manager
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setFetcher((q, c) => fetcherRef.current(q, c));
    }
  }, [fetcher]);

  // Initial load on mount and cleanup on unmount
  useEffect(() => {
    managerRef.current?.refresh();
    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  const setSearchQuery = useCallback((query: string, immediate: boolean = false) => {
    managerRef.current?.setQuery(query, immediate);
  }, []);

  const setSelectedCategoryId = useCallback((categoryId: string | null) => {
    managerRef.current?.setCategoryId(categoryId);
  }, []);

  const resetFilters = useCallback(() => {
    managerRef.current?.resetFilters();
  }, []);

  const refreshCatalog = useCallback(async () => {
    await managerRef.current?.refresh();
  }, []);

  const submitSearch = useCallback(() => {
    managerRef.current?.submitSearch();
  }, []);

  return {
    ...state,
    setSearchQuery,
    setSelectedCategoryId,
    resetFilters,
    refreshCatalog,
    submitSearch,
  };
}
