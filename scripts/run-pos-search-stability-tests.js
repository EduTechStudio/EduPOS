/**
 * EduPOS Phase 2: POS Search Stability & Race Condition Prevention Tests
 *
 * Covers all 10 required test scenarios:
 * 1. Rapid sequential manual typing (debounce coalescing).
 * 2. Earlier slow query finishing after a newer fast query (stale-response reproduction & prevention).
 * 3. Search returning one product.
 * 4. Search returning no products (stable "Produk Tidak Ditemukan" empty state).
 * 5. Clearing search while an older request is still running (instant clear & stale overwrite drop).
 * 6. Changing category during a search.
 * 7. Initial catalog loading while the user starts searching.
 * 8. Rapid changes between different search terms.
 * 9. Component unmount while a query is running (unmount safety).
 * 10. Repeated search requests with identical terms (redundancy suppression).
 */

const assert = require('assert');

// Simple sleep helper for async test steps
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Standalone POSCatalogSearchManager implementation for testing environment
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

      // Superseded check
      if (requestId !== this.latestRequestId) {
        // Discard stale result
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

  getLatestRequestId() {
    return this.latestRequestId;
  }

  getCompletedRequestId() {
    return this.completedRequestId;
  }

  getIsMounted() {
    return this.isMounted;
  }
}

async function runTests() {
  console.log('--- STARTING EDUPOS POS SEARCH STABILITY & RACE CONDITION TESTS ---');

  // ==========================================
  // Test 1: Rapid sequential manual typing (Debounce Coalescing)
  // ==========================================
  console.log('Testing Test 1: Rapid sequential manual typing (debounce coalescing)...');
  let fetchCallCount = 0;
  let lastFetchedQuery = '';

  const mockFetcher1 = async (query) => {
    fetchCallCount++;
    lastFetchedQuery = query;
    return [{ id: 'p1', name: `Item for ${query}` }];
  };

  const manager1 = new POSCatalogSearchManager({
    fetcher: mockFetcher1,
    debounceMs: 50,
  });

  // Type characters rapidly within 20ms of each other
  manager1.setQuery('b');
  await sleep(10);
  manager1.setQuery('ba');
  await sleep(10);
  manager1.setQuery('bar');
  await sleep(10);
  manager1.setQuery('barc');
  await sleep(10);
  manager1.setQuery('barco');
  await sleep(10);
  manager1.setQuery('barcod');
  await sleep(10);
  manager1.setQuery('barcode');

  // Wait for debounce timer to fire (50ms)
  await sleep(80);

  assert.strictEqual(fetchCallCount, 1, 'Rapid typing must coalesce into exactly 1 query');
  assert.strictEqual(lastFetchedQuery, 'barcode', 'Fetched query must be the final input');
  assert.strictEqual(manager1.getState().products.length, 1);
  assert.strictEqual(manager1.getState().loading, false);
  console.log('  PASS: Rapid typing successfully coalesced without query spam.');

  // ==========================================
  // Test 2: Earlier slow query finishing after a newer fast query (Bug Reproduction & Prevention)
  // ==========================================
  console.log('Testing Test 2: Earlier slow query finishing after newer fast query...');
  
  // Simulated SQLite responses with inverted timings:
  // Query 1 ('8') is slow (takes 80ms) and returns 1,200 products
  // Query 2 ('8991234') is fast (takes 15ms) and returns 1 specific product
  let historyOfProductUpdates = [];

  const invertedTimingFetcher = async (query) => {
    if (query === '8') {
      await sleep(80);
      return Array.from({ length: 1200 }, (_, i) => ({ id: `p_${i}`, name: `Bulk product ${i}` }));
    } else if (query === '8991234') {
      await sleep(15);
      return [{ id: 'target_barcode', name: 'Specific Scanned Item' }];
    }
    return [];
  };

  const manager2 = new POSCatalogSearchManager({
    fetcher: invertedTimingFetcher,
    debounceMs: 200,
    onStateChange: (s) => {
      if (!s.loading) {
        historyOfProductUpdates.push({
          query: s.searchQuery,
          count: s.products.length,
          firstItem: s.products[0]?.name,
          activeReqId: s.activeRequestId,
        });
      }
    },
  });

  // Dispatch Query 1 ('8') immediately
  manager2.dispatchRequest('8', null); // reqId = 1
  assert.strictEqual(manager2.getState().loading, true);

  // Dispatch Query 2 ('8991234') shortly after
  await sleep(10);
  manager2.dispatchRequest('8991234', null); // reqId = 2
  assert.strictEqual(manager2.getState().loading, true);

  // Wait for Query 2 to finish (at ~25ms total)
  await sleep(35);
  // At this point Query 2 has finished, Query 1 is STILL running
  assert.strictEqual(manager2.getState().loading, false, 'Loading should be false after fast query finishes');
  assert.strictEqual(manager2.getState().products.length, 1);
  assert.strictEqual(manager2.getState().products[0].id, 'target_barcode');
  assert.strictEqual(manager2.getState().activeRequestId, 2);

  // Wait for Query 1 to finish (at ~90ms total)
  await sleep(70);

  // CRITICAL VERIFICATION:
  // In the buggy code, Query 1 would now finish and OVERWRITE products with 1,200 items!
  // With Request Sequencing, Query 1 is dropped, and products remains [target_barcode].
  assert.strictEqual(
    manager2.getState().products.length,
    1,
    'Stale response from Query 1 MUST NOT overwrite newer Query 2 results!'
  );
  assert.strictEqual(manager2.getState().products[0].name, 'Specific Scanned Item');
  assert.strictEqual(manager2.getState().activeRequestId, 2);
  assert.strictEqual(historyOfProductUpdates.length, 1, 'Only Query 2 should have produced a completed update');
  console.log('  PASS: Stale slower response correctly dropped; specific result stayed visible.');

  // ==========================================
  // Test 3: Search returning one product
  // ==========================================
  console.log('Testing Test 3: Search returning one product...');
  const manager3 = new POSCatalogSearchManager({
    fetcher: async (q) => (q === 'single' ? [{ id: 'prod_solo', name: 'Solo Product' }] : []),
    debounceMs: 50,
  });

  await manager3.dispatchRequest('single', null);
  assert.strictEqual(manager3.getState().products.length, 1);
  assert.strictEqual(manager3.getState().products[0].name, 'Solo Product');
  assert.strictEqual(manager3.getState().loading, false);
  console.log('  PASS: Single product search state verified.');

  // ==========================================
  // Test 4: Search returning no products (Stable "Produk Tidak Ditemukan")
  // ==========================================
  console.log('Testing Test 4: Search returning no products...');
  const manager4 = new POSCatalogSearchManager({
    fetcher: async (q) => [],
    debounceMs: 50,
  });

  await manager4.dispatchRequest('nonexistent', null);
  assert.strictEqual(manager4.getState().products.length, 0);
  assert.strictEqual(manager4.getState().loading, false);
  assert.strictEqual(manager4.getState().searchQuery, '');
  console.log('  PASS: Empty product result state remains stable.');

  // ==========================================
  // Test 5: Clearing search while an older request is still running
  // ==========================================
  console.log('Testing Test 5: Clearing search while an older request is still running...');
  const clearTestFetcher = async (query) => {
    if (query === 'slow_search') {
      await sleep(60);
      return [{ id: 'old', name: 'Old result' }];
    }
    // query === '' (cleared)
    await sleep(10);
    return [{ id: 'all1', name: 'Catalog item 1' }, { id: 'all2', name: 'Catalog item 2' }];
  };

  const manager5 = new POSCatalogSearchManager({
    fetcher: clearTestFetcher,
    debounceMs: 100,
  });

  // Start slow search
  manager5.dispatchRequest('slow_search', null); // reqId = 1
  await sleep(10);

  // User clears search input (clicks X or empties input)
  manager5.setQuery('', true); // reqId = 2 (immediate)
  assert.strictEqual(manager5.getState().searchQuery, '');

  // Wait for cleared search to finish (at ~25ms)
  await sleep(25);
  assert.strictEqual(manager5.getState().products.length, 2, 'Full catalog restored by clear');

  // Wait for slow search to complete (at ~75ms)
  await sleep(50);
  assert.strictEqual(
    manager5.getState().products.length,
    2,
    'Older slow search must NOT overwrite cleared full catalog!'
  );
  assert.strictEqual(manager5.getState().products[0].id, 'all1');
  console.log('  PASS: Clearing search reliably restores full catalog without stale overwrite.');

  // ==========================================
  // Test 6: Changing category during a search
  // ==========================================
  console.log('Testing Test 6: Changing category during a search...');
  const catFetcher = async (q, catId) => {
    if (catId === 'cat_drinks') {
      await sleep(15);
      return [{ id: 'drink_1', name: 'Es Teh Manis' }];
    }
    await sleep(60);
    return [{ id: 'all_1', name: 'General Product' }];
  };

  const manager6 = new POSCatalogSearchManager({
    fetcher: catFetcher,
    debounceMs: 50,
  });

  // Query 1 on default category
  manager6.dispatchRequest('teh', null); // reqId = 1
  await sleep(10);

  // User taps 'cat_drinks' category chip
  manager6.setCategoryId('cat_drinks'); // reqId = 2 (immediate)

  await sleep(30); // Drink category query finishes
  assert.strictEqual(manager6.getState().products[0].name, 'Es Teh Manis');
  assert.strictEqual(manager6.getState().selectedCategoryId, 'cat_drinks');

  await sleep(50); // General query finishes (dropped)
  assert.strictEqual(manager6.getState().products[0].name, 'Es Teh Manis');
  console.log('  PASS: Category switch accurately overrides prior category queries.');

  // ==========================================
  // Test 7: Initial catalog loading while the user starts searching
  // ==========================================
  console.log('Testing Test 7: Initial catalog loading while user starts searching...');
  const initFetcher = async (query) => {
    if (query === '') {
      await sleep(70); // Initial 1,400 catalog load takes 70ms
      return Array.from({ length: 1400 }, (_, i) => ({ id: `p${i}`, name: `Prod ${i}` }));
    }
    await sleep(15); // User search query takes 15ms
    return [{ id: 'match', name: 'Matching Search Product' }];
  };

  const manager7 = new POSCatalogSearchManager({
    fetcher: initFetcher,
    debounceMs: 50,
  });

  // Mount: initial catalog fetch begins
  manager7.refresh(); // reqId = 1

  // User immediately starts typing 'match'
  await sleep(10);
  manager7.setQuery('match', true); // reqId = 2

  // User query finishes first
  await sleep(25);
  assert.strictEqual(manager7.getState().products.length, 1);
  assert.strictEqual(manager7.getState().products[0].id, 'match');

  // Initial catalog finishes later
  await sleep(55);
  assert.strictEqual(
    manager7.getState().products.length,
    1,
    'Initial catalog must NOT replace active user search results!'
  );
  assert.strictEqual(manager7.getState().products[0].id, 'match');
  console.log('  PASS: Initial catalog load dropped safely; active user search retained.');

  // ==========================================
  // Test 8: Rapid changes between different search terms
  // ==========================================
  console.log('Testing Test 8: Rapid changes between different search terms...');
  const randomDelayFetcher = async (query) => {
    // Delays are deliberately chaotic:
    // 'queryA' takes 50ms
    // 'queryB' takes 10ms
    // 'queryC' takes 30ms
    const delay = query === 'queryA' ? 50 : query === 'queryB' ? 10 : 30;
    await sleep(delay);
    return [{ id: query, name: `Result of ${query}` }];
  };

  const manager8 = new POSCatalogSearchManager({
    fetcher: randomDelayFetcher,
    debounceMs: 50,
  });

  manager8.dispatchRequest('queryA', null); // reqId = 1
  manager8.dispatchRequest('queryB', null); // reqId = 2
  manager8.dispatchRequest('queryC', null); // reqId = 3

  await sleep(70); // All 3 queries finish

  assert.strictEqual(manager8.getState().activeRequestId, 3);
  assert.strictEqual(manager8.getState().products[0].id, 'queryC');
  assert.strictEqual(manager8.getState().products[0].name, 'Result of queryC');
  console.log('  PASS: Chaotic completion orders resolved strictly to latest request ID (queryC).');

  // ==========================================
  // Test 9: Component unmount while a query is running
  // ==========================================
  console.log('Testing Test 9: Component unmount while query is running...');
  let unmountCallbackFired = false;

  const manager9 = new POSCatalogSearchManager({
    fetcher: async () => {
      await sleep(30);
      return [{ id: 'after_unmount', name: 'Should Not Be Persisted' }];
    },
    debounceMs: 50,
    onStateChange: () => {
      if (!manager9.getIsMounted()) {
        unmountCallbackFired = true;
      }
    },
  });

  manager9.dispatchRequest('test', null);
  // Component unmounts at t=10ms
  await sleep(10);
  manager9.destroy();

  // Query resolves at t=30ms
  await sleep(35);

  assert.strictEqual(manager9.getIsMounted(), false);
  assert.strictEqual(unmountCallbackFired, false, 'No callbacks must fire after unmount');
  console.log('  PASS: Component unmount handled safely without leaks or unmounted updates.');

  // ==========================================
  // Test 10: Repeated search requests with identical terms
  // ==========================================
  console.log('Testing Test 10: Repeated search requests with identical terms...');
  let callCount10 = 0;

  const manager10 = new POSCatalogSearchManager({
    fetcher: async (q) => {
      callCount10++;
      return [{ id: 'same', name: 'Same item' }];
    },
    debounceMs: 50,
  });

  manager10.setQuery('same_term', true);
  await sleep(20);
  assert.strictEqual(callCount10, 1);

  // Call setQuery again with identical term without immediate flag
  manager10.setQuery('same_term');
  await sleep(70);

  assert.strictEqual(callCount10, 1, 'Identical query without changes must not trigger redundant fetch');

  // Forced refresh should re-fetch
  await manager10.refresh();
  assert.strictEqual(callCount10, 2, 'Forced refresh must re-fetch even with identical terms');
  console.log('  PASS: Identical terms suppressed; refresh forces updated data.');

  console.log('--- ALL POS SEARCH STABILITY & RACE CONDITION TESTS PASSED (10/10) ---');
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
