import { ProductEntity, ProductPriceTierEntity } from '@/database/types';

export type ProductWithTiers = ProductEntity & { priceTiers?: ProductPriceTierEntity[] };

export interface CatalogSearchState {
  searchQuery: string;
  selectedCategoryId: string | null;
  products: ProductWithTiers[];
  loading: boolean;
  loadError: string | null;
  activeRequestId: number;
}

export type CatalogFetcher = (
  query: string,
  categoryId: string | null
) => Promise<ProductWithTiers[]>;

export interface POSCatalogSearchManagerOptions {
  fetcher: CatalogFetcher;
  debounceMs?: number;
  initialQuery?: string;
  initialCategoryId?: string | null;
  onStateChange?: (state: CatalogSearchState) => void;
}

/**
 * POSCatalogSearchManager
 *
 * Implements strict request sequencing, debounced manual input with instant clear,
 * and race condition prevention for POS product catalog search.
 *
 * Guarantees that:
 * 1. Each request receives an incrementing requestId.
 * 2. Earlier requests that finish after newer requests are discarded.
 * 3. Stale loading states cannot turn off active loading states prematurely.
 * 4. Stale product results cannot overwrite newer search results or empty states.
 * 5. Component unmount prevents any state updates.
 */
export class POSCatalogSearchManager {
  private latestRequestId: number = 0;
  private completedRequestId: number = 0;
  private debounceTimeout: any = null;
  private debounceMs: number;
  private fetcher: CatalogFetcher;
  private onStateChange?: (state: CatalogSearchState) => void;
  private isMounted: boolean = true;

  private state: CatalogSearchState;

  constructor(options: POSCatalogSearchManagerOptions) {
    this.fetcher = options.fetcher;
    this.debounceMs = options.debounceMs ?? 250;
    this.onStateChange = options.onStateChange;

    this.state = {
      searchQuery: options.initialQuery ?? '',
      selectedCategoryId: options.initialCategoryId ?? null,
      products: [],
      loading: true,
      loadError: null,
      activeRequestId: 0,
    };
  }

  public getState(): CatalogSearchState {
    return { ...this.state };
  }

  public setFetcher(fetcher: CatalogFetcher): void {
    this.fetcher = fetcher;
  }

  private notify(): void {
    if (this.isMounted && this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  /**
   * Update search query.
   * Immediately invalidates all in-flight requests.
   * If empty or immediate, cancels debounce and dispatches immediately.
   * Otherwise maintains loading state and sets a debounce timer (default ~250ms).
   */
  public setQuery(newQuery: string, immediate: boolean = false): void {
    if (newQuery === this.state.searchQuery && !immediate) {
      return;
    }

    this.state.searchQuery = newQuery;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Immediately invalidate all older in-flight requests before debounce begins
    this.latestRequestId++;
    this.state.loading = true;
    this.state.loadError = null;

    if (immediate || newQuery.trim() === '') {
      this.dispatchRequest(newQuery, this.state.selectedCategoryId);
    } else {
      this.notify();
      this.debounceTimeout = setTimeout(() => {
        this.debounceTimeout = null;
        if (!this.isMounted) return;
        this.dispatchRequest(this.state.searchQuery, this.state.selectedCategoryId);
      }, this.debounceMs);
    }
  }

  /**
   * Update selected category filter.
   * Immediately cancels debounce and dispatches request with current query.
   */
  public setCategoryId(newCategoryId: string | null): void {
    if (newCategoryId === this.state.selectedCategoryId) {
      return;
    }

    this.state.selectedCategoryId = newCategoryId;
    this.notify();

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    this.dispatchRequest(this.state.searchQuery, newCategoryId);
  }

  /**
   * Reset both search query and category filters immediately.
   */
  public resetFilters(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    this.state.searchQuery = '';
    this.state.selectedCategoryId = null;
    this.notify();

    this.dispatchRequest('', null);
  }

  /**
   * Immediately submit whatever query is currently typed (e.g. on keyboard Enter).
   */
  public submitSearch(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.dispatchRequest(this.state.searchQuery, this.state.selectedCategoryId);
  }

  /**
   * Force refresh catalog with current query and category (e.g. after checkout or stock adjust).
   */
  public refresh(): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    return this.dispatchRequest(this.state.searchQuery, this.state.selectedCategoryId);
  }

  /**
   * Internal request dispatcher with request sequencing.
   * Increments latestRequestId and drops any older asynchronous responses.
   */
  public async dispatchRequest(query: string, categoryId: string | null): Promise<void> {
    const requestId = ++this.latestRequestId;

    this.state.loading = true;
    this.state.loadError = null;
    this.notify();

    try {
      const results = await this.fetcher(query, categoryId);

      // Check unmount
      if (!this.isMounted) return;

      // Check if superseded by a newer request
      if (requestId !== this.latestRequestId) {
        // Earlier slow request finishing after a newer fast query - DROP!
        return;
      }

      this.completedRequestId = requestId;
      this.state.products = results;
      this.state.loading = false;
      this.state.loadError = null;
      this.state.activeRequestId = requestId;
      this.notify();
    } catch (err: any) {
      if (!this.isMounted) return;

      // Check if superseded
      if (requestId !== this.latestRequestId) {
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      this.state.loading = false;
      this.state.loadError = errMsg;
      this.notify();
    }
  }

  /**
   * Teardown on unmount.
   */
  public destroy(): void {
    this.isMounted = false;
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    // Invalidate any in-flight requests
    this.latestRequestId++;
  }

  // Diagnostics and testing inspection methods
  public getLatestRequestId(): number {
    return this.latestRequestId;
  }

  public getCompletedRequestId(): number {
    return this.completedRequestId;
  }

  public getIsMounted(): boolean {
    return this.isMounted;
  }
}
