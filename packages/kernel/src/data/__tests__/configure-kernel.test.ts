import { configureKernel } from '../configure-kernel';
import { withKernel } from '../registry';
import { createReporter } from '../../reporter';
import type { Reporter } from '../../reporter';
import { invalidate as invalidateCache } from '../../resource/cache';
import { getHooks } from '../../actions/context';
import { KernelError } from '../../error/KernelError';
import type { KernelRegistry } from '../types';

jest.mock('../registry', () => ({
	withKernel: jest.fn(() => jest.fn()),
}));

jest.mock('../../reporter', () => ({
	createReporter: jest.fn(),
}));

jest.mock('../../resource/cache', () => ({
	invalidate: jest.fn(),
}));

jest.mock('../../actions/context', () => ({
	getHooks: jest.fn(),
}));

function createMockReporter(): Reporter {
	const reporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(),
	};

	(reporter.child as jest.Mock).mockImplementation(() => reporter);
	return reporter;
}

describe('configureKernel', () => {
	const mockHooks = { doAction: jest.fn() };
	const mockReporter = createMockReporter();

	beforeEach(() => {
		jest.clearAllMocks();
		(getHooks as jest.Mock).mockReturnValue(mockHooks);
		(createReporter as jest.Mock).mockReturnValue(mockReporter);
		(withKernel as jest.Mock).mockImplementation(() => jest.fn());
		(invalidateCache as jest.Mock).mockImplementation(() => undefined);
		globalThis.getWPData = jest.fn();
	});

	it('delegates to withKernel with resolved configuration', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;
		const cleanup = jest.fn();
		const customMiddleware = jest.fn();

		(withKernel as jest.Mock).mockReturnValue(cleanup);

		const kernel = configureKernel({
			namespace: 'acme',
			registry,
			reporter: mockReporter,
			middleware: [customMiddleware],
			ui: { enable: true },
		});

		expect(withKernel).toHaveBeenCalledWith(registry, {
			namespace: 'acme',
			reporter: mockReporter,
			middleware: [customMiddleware],
		});
		expect(kernel.getNamespace()).toBe('acme');
		expect(kernel.getReporter()).toBe(mockReporter);
		expect(kernel.ui.isEnabled()).toBe(true);
		expect(kernel.getRegistry()).toBe(registry);

		kernel.teardown();
		expect(cleanup).toHaveBeenCalled();
	});

	it('creates a reporter when one is not provided', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		const kernel = configureKernel({ namespace: 'acme', registry });

		expect(createReporter).toHaveBeenCalledWith({
			namespace: 'acme',
			channel: 'all',
			level: 'debug',
		});
		expect(kernel.getReporter()).toBe(mockReporter);
	});

	it('falls back to global registry when not provided', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		(globalThis.getWPData as jest.Mock).mockReturnValue(registry);

		configureKernel();

		expect(globalThis.getWPData).toHaveBeenCalled();
		expect(withKernel).toHaveBeenCalledWith(registry, expect.any(Object));
	});

	it('skips registry wiring when registry is unavailable', () => {
		(globalThis.getWPData as jest.Mock).mockReturnValue(undefined);

		configureKernel();

		expect(withKernel).not.toHaveBeenCalled();
	});

	it('delegates invalidate calls to resource cache', () => {
		const kernel = configureKernel({ namespace: 'acme' });
		const patterns = ['post', 'list'];

		kernel.invalidate(patterns);
		expect(invalidateCache).toHaveBeenCalledWith(patterns, undefined);

		kernel.invalidate(patterns, { emitEvent: false });
		expect(invalidateCache).toHaveBeenCalledWith(patterns, {
			emitEvent: false,
		});
	});

	it('emits events through WordPress hooks', () => {
		const kernel = configureKernel({ namespace: 'acme' });
		const payload = { foo: 'bar' };

		kernel.emit('wpk.event', payload);

		expect(mockHooks.doAction).toHaveBeenCalledWith('wpk.event', payload);
	});

	it('throws KernelError when emit is called with invalid event name', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		expect(() => kernel.emit('', {})).toThrow(KernelError);
	});

	it('reports UI disabled state by default', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		expect(kernel.ui.isEnabled()).toBe(false);
	});
});
