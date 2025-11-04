/**
 * Type definitions for WP Kernel E2E utilities
 *
 * @module
 */

import type { Locator, Page } from '@playwright/test';
import type {
	Admin,
	Editor,
	PageUtils,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';
import type { ResourceConfig } from '@wpkernel/core/resource';

export type WPKernelResourceConfig = ResourceConfig<unknown, unknown>;

export type { ResourceConfig };

/**
 * WordPress E2E fixture context passed to the factory
 */
export type WordPressFixtures = {
	page: Page;
	requestUtils: RequestUtils;
	admin: Admin;
	editor: Editor;
	pageUtils: PageUtils;
};

/**
 * Resource utilities for seeding and cleanup
 */
export type ResourceUtils<T = unknown> = {
	/**
	 * Seed a single resource via REST API
	 *
	 * @param data - Resource data to create
	 * @return Created resource with ID
	 */
	seed: (data: Partial<T>) => Promise<T & { id: string | number }>;

	/**
	 * Seed multiple resources in bulk
	 *
	 * @param items - Array of resource data to create
	 * @return Array of created resources with IDs
	 */
	seedMany: (
		items: Partial<T>[]
	) => Promise<Array<T & { id: string | number }>>;

	/**
	 * Remove a single resource by ID
	 *
	 * @param id - Resource ID to delete
	 */
	remove: (id: string | number) => Promise<void>;

	/**
	 * Delete all resources (cleanup utility)
	 * WARNING: This will delete all resources of this type
	 */
	deleteAll: () => Promise<void>;
};

/**
 * Helper options for interacting with DataViews in Playwright.
 */
export type DataViewHelperOptions = {
	/** Resource name used to locate the DataView wrapper. */
	resource: string;
	/** Optional namespace attribute to disambiguate multiple runtimes. */
	namespace?: string;
	/** Optional CSS selector limiting the search scope. */
	within?: string;
};

/**
 * Convenience helpers for interacting with ResourceDataView in tests.
 */
export type DataViewHelper = {
	/** Root locator for the DataView wrapper. */
	root: () => Locator;
	/** Wait until the DataView reports that loading has finished. */
	waitForLoaded: () => Promise<void>;
	/** Fill the toolbar search control. */
	search: (value: string) => Promise<void>;
	/** Clear the search control. */
	clearSearch: () => Promise<void>;
	/** Retrieve a locator for a row containing the provided text. */
	getRow: (text: string) => Locator;
	/** Toggle selection for a row that matches the provided text. */
	selectRow: (text: string) => Promise<void>;
	/** Trigger a bulk action button by its visible label. */
	runBulkAction: (label: string) => Promise<void>;
	/** Read the bulk selection counter rendered in the footer. */
	getSelectedCount: () => Promise<number>;
	/** Read the total item count exposed by the wrapper metadata. */
	getTotalCount: () => Promise<number>;
};

/**
 * Store utilities for waiting on resolvers and state
 */
export type StoreUtils<T = unknown> = {
	/**
	 * Wait for store selector to return truthy value
	 *
	 * @param selector - Function that receives store state and returns data
	 * @param timeout  - Max wait time in ms (default: 5000)
	 * @return Resolved data from selector
	 */
	wait: <R>(selector: (state: T) => R, timeout?: number) => Promise<R>;

	/**
	 * Invalidate store cache to trigger refetch
	 */
	invalidate: () => Promise<void>;

	/**
	 * Get current store state
	 *
	 * @return Current state object
	 */
	getState: () => Promise<T>;
};

/**
 * Event recorder options
 */
export type EventRecorderOptions = {
	/**
	 * Optional regex pattern to filter events
	 * @example /^wpk\.job\./
	 */
	pattern?: RegExp;
};

/**
 * Captured event structure
 */
export type CapturedEvent<P = unknown> = {
	type: string;
	payload?: P;
	timestamp: number;
};

/**
 * Event utilities for capturing and asserting on kernel events
 */
export type EventRecorder<P = unknown> = {
	/**
	 * Get all captured events
	 */
	list: () => Promise<CapturedEvent<P>[]>;

	/**
	 * Find first event matching type
	 *
	 * @param type - Event type to search for
	 * @return First matching event or undefined
	 */
	find: (type: string) => Promise<CapturedEvent<P> | undefined>;

	/**
	 * Find all events matching type
	 *
	 * @param type - Event type to search for
	 * @return Array of matching events
	 */
	findAll: (type: string) => Promise<CapturedEvent<P>[]>;

	/**
	 * Clear all captured events
	 */
	clear: () => Promise<void>;

	/**
	 * Stop recording events
	 */
	stop: () => Promise<void>;
};

/**
 * Main kernel utilities object returned by factory
 */
export type KernelUtils = {
	/**
	 * Create resource utilities for a given resource config
	 *
	 * @param config - Resource configuration from defineResource
	 * @return Resource utilities with typed methods
	 */
	resource: <T = unknown>(config: WPKernelResourceConfig) => ResourceUtils<T>;

	/**
	 * Create store utilities for a given store key
	 *
	 * @param storeKey - WordPress data store key (e.g., 'wpk/job')
	 * @return Store utilities with typed methods
	 */
	store: <T = unknown>(storeKey: string) => StoreUtils<T>;

	/**
	 * Create event recorder for capturing kernel events
	 *
	 * @param options - Optional configuration for event filtering
	 * @return Event recorder with capture and query methods
	 */
	events: <P = unknown>(
		options?: EventRecorderOptions
	) => Promise<EventRecorder<P>>;

	/**
	 * Interact with a DataView rendered via ResourceDataView.
	 *
	 * @param options - Selection options for the DataView wrapper.
	 */
	dataview: (options: DataViewHelperOptions) => DataViewHelper;
};
