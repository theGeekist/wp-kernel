import { KernelError } from '@wpkernel/core/contracts';
import {
	clearNamespaceState,
	createMockWpPackage,
	ensureWpData,
	setKernelPackage,
	setProcessEnv,
	setWpPluginData,
	type WordPressData,
} from '../wp.test-support.js';

describe('test-utils/wp.test-support', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		clearNamespaceState();
		delete (window as { wp?: unknown }).wp;
		for (const key of Object.keys(process.env)) {
			delete process.env[key];
		}
		Object.assign(process.env, originalEnv);
	});

	function installWp(overrides: Partial<NonNullable<Window['wp']>> = {}) {
		const data: WordPressData = {
			select: jest.fn(),
			dispatch: jest.fn(),
			subscribe: jest.fn(),
		} as unknown as WordPressData;

		const wpGlobal = {
			data,
			apiFetch: jest.fn() as unknown as NonNullable<
				Window['wp']
			>['apiFetch'],
			hooks: {
				doAction: jest.fn(),
			} as unknown,
			...overrides,
		} as unknown as NonNullable<Window['wp']>;

		window.wp = wpGlobal;

		return window.wp;
	}

	it('throws a KernelError when wp is not initialised', () => {
		delete (window as { wp?: unknown }).wp;
		expect(() => ensureWpData()).toThrow(KernelError);
	});

	it('returns the data package when wp is initialised', () => {
		const wp = installWp();

		expect(ensureWpData()).toBe(wp.data);
	});

	it('creates predictable mock packages', () => {
		expect(createMockWpPackage()).toEqual({ name: 'test-package' });
		expect(createMockWpPackage({ version: '1.2.3' })).toEqual({
			name: 'test-package',
			version: '1.2.3',
		});
	});

	it('sets and clears kernel package metadata', () => {
		setKernelPackage({ name: 'cli', version: '1.0.0' });
		expect(
			(globalThis as { __WP_KERNEL_PACKAGE__?: unknown })
				.__WP_KERNEL_PACKAGE__
		).toEqual({
			name: 'cli',
			version: '1.0.0',
		});

		setKernelPackage(null);
		expect('__WP_KERNEL_PACKAGE__' in globalThis).toBe(false);
	});

	it('maps plugin data for namespace detection', () => {
		installWp();
		setWpPluginData({ name: 'kernel', slug: 'wp-kernel' });

		expect(window.wpKernelData).toEqual({
			textDomain: 'kernel',
			slug: 'wp-kernel',
		});
	});

	it('applies process env overrides safely', () => {
		setProcessEnv({ NODE_ENV: 'test' });

		expect(process.env.NODE_ENV).toBe('test');
	});
});
