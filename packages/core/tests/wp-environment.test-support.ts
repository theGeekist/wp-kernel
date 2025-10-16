import {
	clearNamespaceState,
	ensureWpData,
	type WordPressData,
} from '../../../tests/test-utils/wp.test-support.js';

export interface WordPressHarnessOverrides {
	data?: Partial<WordPressData>;
	apiFetch?: jest.Mock;
	hooks?: Partial<NonNullable<Window['wp']>['hooks']>;
}

export interface WordPressTestHarness {
	/** The mock WordPress global that has been installed. */
	wp: NonNullable<Window['wp']>;
	/**
	 * Convenience access to the shared data package to avoid calling
	 * `ensureWpData()` repeatedly in suites.
	 */
	data: WordPressData;
	/** Reset namespace state and clear all jest mocks. */
	reset: () => void;
	/** Restore the previous global and perform a reset. */
	teardown: () => void;
}

function createDefaultData(
	overrides: Partial<WordPressData> = {}
): WordPressData {
	const base = {
		select: jest.fn(),
		dispatch: jest.fn(),
		subscribe: jest.fn(),
		createReduxStore: jest.fn(),
		register: jest.fn(),
	} as Partial<WordPressData>;

	return {
		...base,
		...overrides,
	} as WordPressData;
}

function createDefaultHooks(
	overrides: Partial<NonNullable<Window['wp']>['hooks']> = {}
): NonNullable<Window['wp']>['hooks'] {
	const base = {
		addAction: jest.fn(),
		addFilter: jest.fn(),
		applyFilters: jest.fn(),
		doAction: jest.fn(),
		removeAction: jest.fn(),
		removeFilter: jest.fn(),
	} satisfies Partial<NonNullable<Window['wp']>['hooks']>;

	return {
		...base,
		...overrides,
	} as NonNullable<Window['wp']>['hooks'];
}

export function createWordPressTestHarness(
	overrides: WordPressHarnessOverrides = {}
): WordPressTestHarness {
	const originalWp = window.wp;

	const data = createDefaultData(overrides.data);
	const hooks = createDefaultHooks(overrides.hooks);
	const apiFetch = overrides.apiFetch ?? jest.fn();

	const wp = {
		data,
		apiFetch,
		hooks,
	} as unknown as NonNullable<Window['wp']>;

	window.wp = wp;

	const reset = () => {
		clearNamespaceState();
		jest.clearAllMocks();
	};

	const teardown = () => {
		reset();
		if (originalWp === undefined) {
			delete (window as { wp?: unknown }).wp;
		} else {
			window.wp = originalWp;
		}
	};

	return {
		wp,
		data,
		reset,
		teardown,
	};
}

export { ensureWpData };
