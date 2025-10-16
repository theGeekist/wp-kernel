import {
	applyActionRuntimeOverrides,
	withActionRuntimeOverrides,
} from '../action-runtime.test-support.js';
import {
	createWordPressTestHarness,
	ensureWpData,
} from '../wp-environment.test-support.js';

describe('@wpkernel/core test-support helpers', () => {
	afterEach(() => {
		delete (window as { wp?: unknown }).wp;
		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('installs a reusable WordPress harness', () => {
		const originalWp = window.wp;
		const harness = createWordPressTestHarness();

		expect(window.wp).toBe(harness.wp);
		expect(ensureWpData()).toBe(harness.data);

		harness.reset();
		expect(jest.mocked(harness.wp.apiFetch).mock.calls).toHaveLength(0);

		harness.teardown();
		expect(window.wp).toBe(originalWp);
	});

	it('restores the action runtime after overrides', () => {
		const cleanup = applyActionRuntimeOverrides({
			runtime: { reporter: { log: jest.fn() } as never },
		});

		expect(globalThis.__WP_KERNEL_ACTION_RUNTIME__).toBeDefined();

		cleanup();
		expect('__WP_KERNEL_ACTION_RUNTIME__' in globalThis).toBe(false);
	});

	it('executes callbacks with temporary runtime overrides', async () => {
		const log = jest.fn();

		await withActionRuntimeOverrides(
			{ runtime: { reporter: { log } as never } },
			async () => {
				expect(
					globalThis.__WP_KERNEL_ACTION_RUNTIME__?.reporter?.log
				).toBe(log);
			}
		);

		expect('__WP_KERNEL_ACTION_RUNTIME__' in globalThis).toBe(false);
	});
});
