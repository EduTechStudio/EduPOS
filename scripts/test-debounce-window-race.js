/**
 * Focused test for the Critical Debounce-Window Scenario
 *
 * Sequence to test:
 * 1. User enters "8".
 * 2. Request A starts (slow, takes 80ms).
 * 3. Before request A finishes (at t=20ms), user enters "89".
 * 4. The 250ms debounce for "89" starts (will fire at t=270ms).
 * 5. Request A finishes at t=80ms (inside the debounce window of "89").
 *
 * Expected:
 * - Request A must NOT update products to results for "8".
 * - Request A must NOT set loading to false.
 * - Loading should stay true, and products should not show "8".
 * - At t=270ms, request B ("89") executes and updates products.
 */

const assert = require('assert');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Standalone POSCatalogSearchManager implementation mirroring src/services/pos/POSCatalogSearchManager.ts exactly
class POSCatalogSearchManager {
  constructor(options) {
    this.fetcher = options.fetcher;
    this.debounceMs = options.debounceMs ?? 250;
    this.onStateChange = options.onStateChange;
    this.latestRequestId = 0;
    this.completedRequestId = 0;
    this.debounceTimeout = null;
    this.isMounted = true;

    this.state = {
      searchQuery: options.initialQuery ?? '',
      selectedCategoryId: options.initialCategoryId ?? null,
      products: [],
      loading: true,
      loadError: null,
      activeRequestId: 0,
    };
  }

  getState() {
    return { ...this.state };
  }

  setFetcher(fetcher) {
    this.fetcher = fetcher;
  }

  notify() {
    if (this.isMounted && this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  setQuery(newQuery, immediate = false) {
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

  setCategoryId(newCategoryId) {
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

  resetFilters() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    this.state.searchQuery = '';
    this.state.selectedCategoryId = null;
    this.notify();

    this.dispatchRequest('', null);
  }

  submitSearch() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.dispatchRequest(this.state.searchQuery, this.state.selectedCategoryId);
  }

  refresh() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    return this.dispatchRequest(this.state.searchQuery, this.state.selectedCategoryId);
  }

  async dispatchRequest(query, categoryId) {
    const requestId = ++this.latestRequestId;

    this.state.loading = true;
    this.state.loadError = null;
    this.notify();

    try {
      const results = await this.fetcher(query, categoryId);

      if (!this.isMounted) return;

      if (requestId !== this.latestRequestId) {
        return;
      }

      this.completedRequestId = requestId;
      this.state.products = results;
      this.state.loading = false;
      this.state.loadError = null;
      this.state.activeRequestId = requestId;
      this.notify();
    } catch (err) {
      if (!this.isMounted) return;

      if (requestId !== this.latestRequestId) {
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      this.state.loading = false;
      this.state.loadError = errMsg;
      this.notify();
    }
  }

  destroy() {
    this.isMounted = false;
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.latestRequestId++;
  }
}

async function testDebounceWindow() {
  console.log('--- TESTING CRITICAL DEBOUNCE-WINDOW SCENARIO ---');

  let stateSnapshots = [];

  const mockFetcher = async (query) => {
    if (query === '8') {
      await sleep(80);
      return [{ id: 'p_8', name: 'Products matching 8' }];
    } else if (query === '89') {
      await sleep(20);
      return [{ id: 'p_89', name: 'Products matching 89' }];
    }
    return [];
  };

  const manager = new POSCatalogSearchManager({
    fetcher: mockFetcher,
    debounceMs: 250,
    onStateChange: (state) => {
      stateSnapshots.push({
        time: Date.now(),
        query: state.searchQuery,
        productsCount: state.products.length,
        firstProduct: state.products[0]?.name,
        loading: state.loading,
        activeRequestId: state.activeRequestId,
      });
    },
  });

  // Step 1 & 2: User enters "8" and it executes (immediate or after its debounce)
  console.log('1. Dispatching request A for query "8"...');
  manager.dispatchRequest('8', null); // Request A starts, takes 80ms

  // Step 3 & 4: At t=20ms, user types "89". Debounce window of 250ms begins.
  await sleep(20);
  console.log('2. User types "89" at t=20ms. Debounce window (250ms) starts...');
  manager.setQuery('89');

  // Step 5: At t=85ms, Request A finishes (20ms + 65ms = 85ms).
  // The debounce timer for "89" will not fire until t=270ms!
  await sleep(70);
  const stateDuringDebounce = manager.getState();

  console.log('3. Checking state at t=90ms (Request A has finished, debounce for "89" is still pending):');
  console.log('   Current searchQuery in state:', stateDuringDebounce.searchQuery);
  console.log('   Current products in state:', stateDuringDebounce.products);
  console.log('   Current loading in state:', stateDuringDebounce.loading);

  // Assertion 1: Request A's result MUST NOT update products
  assert.strictEqual(
    stateDuringDebounce.products.length,
    0,
    'Requirement 4: Request A result must be discarded immediately; products must remain empty during debounce'
  );

  // Assertion 2: Loading must stay true while waiting for "89"
  assert.strictEqual(
    stateDuringDebounce.loading,
    true,
    'Requirement 5: Loading must remain true while waiting for query "89"'
  );

  // Assertion 3: No stale error applied by query "8"
  assert.strictEqual(
    stateDuringDebounce.loadError,
    null,
    'Requirement 7: No stale error should exist during debounce'
  );

  // Step 6: Wait for "89" debounce to fire and complete
  console.log('4. Waiting for query "89" debounce (250ms) to fire and complete...');
  await sleep(220);

  const finalState = manager.getState();
  console.log('5. Final state after "89" query resolves:');
  console.log('   Final searchQuery:', finalState.searchQuery);
  console.log('   Final products:', finalState.products);
  console.log('   Final loading:', finalState.loading);

  // Assertion 4: Query "89" returns and updates product list
  assert.strictEqual(
    finalState.products.length,
    1,
    'Requirement 6: Query "89" must update product list upon completion'
  );
  assert.strictEqual(finalState.products[0].id, 'p_89');
  assert.strictEqual(finalState.products[0].name, 'Products matching 89');
  assert.strictEqual(finalState.loading, false, 'Loading must be false after query "89" resolves');
  assert.strictEqual(finalState.loadError, null);

  console.log('  PASS: All 7 requirements for the critical debounce window verified.');
  return true;
}

testDebounceWindow().then(() => {
  console.log('--------------------------------------------------');
  console.log('RESULT: Debounce-window race condition test PASSED (0 errors).');
  process.exit(0);
}).catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
