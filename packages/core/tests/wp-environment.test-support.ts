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

type WordPressHooks = NonNullable<Window['wp']>['hooks'];

export interface WithWordPressDataOptions {
	wp?: WordPressTestHarness['wp'] | null;
	data?: Partial<WordPressData> | null;
	hooks?: Partial<WordPressHooks> | null;
	apiFetch?: jest.Mock | null;
}

function hasOverride(
	overrides: WithWordPressDataOptions,
	key: keyof WithWordPressDataOptions
): boolean {
	return Object.prototype.hasOwnProperty.call(overrides, key);
}

const SEGMENT_KEYS: Array<'data' | 'hooks' | 'apiFetch'> = [
	'data',
	'hooks',
	'apiFetch',
];

function mergeSegment<
	T extends keyof Pick<WithWordPressDataOptions, 'data' | 'hooks'>,
>(
	base: Record<string, unknown>,
	key: T,
	override: WithWordPressDataOptions[T],
	current: unknown
) {
	if (!hasOverride({ [key]: override } as WithWordPressDataOptions, key)) {
		return;
	}

	if (override === null) {
		delete base[key];
		return;
	}

	base[key] = {
		...(current && typeof current === 'object'
			? (current as Record<string, unknown>)
			: {}),
		...(override as Record<string, unknown>),
	};
}

function computeNextWordPressGlobal(
	originalWp: WordPressTestHarness['wp'] | undefined,
	overrides: WithWordPressDataOptions
): WordPressTestHarness['wp'] | undefined {
	if (hasOverride(overrides, 'wp')) {
		return overrides.wp === null ? undefined : (overrides.wp ?? originalWp);
	}

	const hasSegmentOverride = SEGMENT_KEYS.some((key) =>
		hasOverride(overrides, key)
	);

	if (!hasSegmentOverride) {
		return originalWp;
	}

	const base: Record<string, unknown> = { ...(originalWp ?? {}) };

	mergeSegment(base, 'data', overrides.data, originalWp?.data);
	mergeSegment(base, 'hooks', overrides.hooks, originalWp?.hooks);

	if (hasOverride(overrides, 'apiFetch')) {
		const apiFetchOverride = overrides.apiFetch;
		if (apiFetchOverride === null) {
			delete base.apiFetch;
		} else {
			base.apiFetch = apiFetchOverride;
		}
	}

	return base as WordPressTestHarness['wp'];
}

export async function withWordPressData<ReturnType>(
	overrides: WithWordPressDataOptions,
	callback: () => ReturnType | Promise<ReturnType>
): Promise<ReturnType> {
	if (typeof window === 'undefined') {
		return await callback();
	}

	const windowWithWp = window as Window & {
		wp?: WordPressTestHarness['wp'];
	};
	const originalWp = windowWithWp.wp;
	const nextWp = computeNextWordPressGlobal(originalWp, overrides);

	try {
		if (nextWp === undefined) {
			delete (windowWithWp as { wp?: WordPressTestHarness['wp'] }).wp;
		} else if (nextWp !== originalWp) {
			windowWithWp.wp = nextWp;
		}

		return await callback();
	} finally {
		if (originalWp === undefined) {
			delete (windowWithWp as { wp?: WordPressTestHarness['wp'] }).wp;
		} else {
			windowWithWp.wp = originalWp;
		}
	}
}

export interface ApiFetchHarnessOptions {
	data?: Partial<WordPressData>;
	hooks?: Partial<WordPressHooks>;
	apiFetch?: jest.Mock;
}

export interface ApiFetchHarness {
	harness: WordPressTestHarness;
	apiFetch: jest.Mock;
	hooks: WordPressHooks;
	doAction: jest.Mock;
}

export function createApiFetchHarness(
	options: ApiFetchHarnessOptions = {}
): ApiFetchHarness {
	const apiFetch = options.apiFetch ?? jest.fn();
	const overrideDoAction = options.hooks?.doAction;
	const doAction = jest.fn((...args: unknown[]) => {
		if (typeof overrideDoAction === 'function') {
			(overrideDoAction as (...innerArgs: unknown[]) => unknown)(...args);
		}
	});

	const harness = createWordPressTestHarness({
		data: options.data,
		apiFetch,
		hooks: {
			...options.hooks,
			doAction,
		},
	});

	return {
		harness,
		apiFetch,
		hooks: harness.wp.hooks,
		doAction,
	};
}
