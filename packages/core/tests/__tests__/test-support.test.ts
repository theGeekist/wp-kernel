import type { Reporter } from '../../src/reporter/types.js';
import {
	applyActionRuntimeOverrides,
	withActionRuntimeOverrides,
} from '../action-runtime.test-support.js';
import {
	createWordPressTestHarness,
	ensureWpData,
} from '../wp-environment.test-support.js';

describe('@wpkernel/core test-support helpers', () => {
	const createReporterStub = (): Reporter => {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn<Reporter, [string]>(() => reporter),
		};

		return reporter;
	};

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
		const apiFetchMock = harness.wp.apiFetch as unknown as jest.Mock;
		expect(apiFetchMock.mock.calls).toHaveLength(0);

		harness.teardown();
		expect(window.wp).toBe(originalWp);
	});

	it('restores the action runtime after overrides', () => {
		const reporter = createReporterStub();

		const cleanup = applyActionRuntimeOverrides({
			runtime: { reporter },
		});

		expect(globalThis.__WP_KERNEL_ACTION_RUNTIME__).toBeDefined();

		cleanup();
		expect('__WP_KERNEL_ACTION_RUNTIME__' in globalThis).toBe(false);
	});

	it('executes callbacks with temporary runtime overrides', async () => {
		const reporter = createReporterStub();

		const infoSpy = reporter.info as jest.Mock;

		await withActionRuntimeOverrides(
			{ runtime: { reporter } },
			async () => {
				expect(
					globalThis.__WP_KERNEL_ACTION_RUNTIME__?.reporter?.info
				).toBe(infoSpy);
			}
		);

		expect('__WP_KERNEL_ACTION_RUNTIME__' in globalThis).toBe(false);
	});
});
