/**
 * Jest Test Setup (TypeScript)
 *
 * Clean, type-safe Jest setup that provides minimal WordPress stubs
 * and avoids object replacement patterns. Uses property-level mocking
 * with proper TypeScript integration.
 */

// Optional: Add custom matchers
// import matchers from 'jest-extended';
// expect.extend(matchers);

/**
 * Complete WPData stub that satisfies the global type requirements
 * Provides all @wordpress/data exports as mocks to match the type interface
 */
const wpDataStub = {
	// Core store methods
	createReduxStore: jest.fn(),
	register: jest.fn(),
	select: jest.fn(),
	dispatch: jest.fn(),
	subscribe: jest.fn(),

	// Higher-order components
	withSelect: jest.fn(),
	withDispatch: jest.fn(),
	withRegistry: jest.fn(),

	// Hooks
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
	useRegistry: jest.fn(),

	// Registry methods
	combineReducers: jest.fn(),
	controls: {},
	createRegistry: jest.fn(),
	createRegistryControl: jest.fn(),
	createRegistrySelector: jest.fn(),

	// Additional exports from @wordpress/data
	RegistryProvider: jest.fn(),
	AsyncModeProvider: jest.fn(),
	RegistryConsumer: jest.fn(),

	// Selectors and controls
	resolveSelect: jest.fn(),
	suspendSelect: jest.fn(),
} as any; // Use 'as any' to satisfy the complex @wordpress/data type requirements

/**
 * Global test environment setup
 * Runs before each test to ensure clean, predictable state
 */
beforeEach(() => {
	// Ensure process.env is available for Node.js compatibility
	if (!global.process) {
		(global as { process?: Partial<NodeJS.Process> }).process = {
			env: { NODE_ENV: 'test' },
		};
	} else if (!global.process.env) {
		global.process.env = { NODE_ENV: 'test' };
	}

	// Implement getWPData globally (imported from kernel implementation)
	// The actual implementation is provided by packages/kernel/src/index.ts
	// which gets loaded during module resolution

	// Set up WordPress globals with proper typing
	// Thanks to ambient declarations in test-globals.d.ts, window.wp is properly typed
	window.wp = {
		data: wpDataStub,
	};

	// Implement getWPData globally for tests
	// This provides the same implementation as packages/kernel/src/index.ts
	(globalThis as { getWPData?: () => unknown }).getWPData = () => {
		if (typeof window === 'undefined') {
			return undefined;
		}
		return (window as { wp?: { data?: unknown } }).wp?.data;
	};

	// Ensure clean timer state
	jest.clearAllTimers();
});

/**
 * Global test cleanup
 * Runs after each test to clean up any remaining state
 */
afterEach(() => {
	// Reset to real timers if any tests used fake timers
	jest.useRealTimers();

	// Clear all mocks to avoid test interference
	jest.clearAllMocks();

	// NOTE: Do NOT automatically clean up test-specific globals like
	// wpKernelData or __WP_KERNEL_PACKAGE__ here, as this interferes
	// with test utilities that manage these explicitly within tests.
	// Tests should clean up their own globals using test utilities.
});
