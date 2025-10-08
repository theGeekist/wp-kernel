import { configureKernel } from '../configure-kernel';
import { withKernel } from '../registry';
import { createReporter } from '../../reporter';
import type { Reporter } from '../../reporter';
import { invalidate as invalidateCache } from '../../resource/cache';
import { KernelError } from '../../error/KernelError';
import type { KernelRegistry } from '../types';
import {
        KernelEventBus,
        getKernelEventBus,
        setKernelEventBus,
} from '../../events/bus';

jest.mock('../registry', () => ({
	withKernel: jest.fn(() => jest.fn()),
}));

jest.mock('../../reporter', () => ({
	createReporter: jest.fn(),
}));

jest.mock('../../resource/cache', () => ({
	invalidate: jest.fn(),
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
        const mockReporter = createMockReporter();

        beforeEach(() => {
                jest.clearAllMocks();
                (createReporter as jest.Mock).mockReturnValue(mockReporter);
                (withKernel as jest.Mock).mockImplementation(() => jest.fn());
                (invalidateCache as jest.Mock).mockImplementation(() => undefined);
                globalThis.getWPData = jest.fn();
                setKernelEventBus(new KernelEventBus());
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
                        events: expect.any(KernelEventBus),
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
                expect(withKernel).toHaveBeenCalledWith(
                        registry,
                        expect.objectContaining({ events: expect.any(KernelEventBus) })
                );
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

        it('emits custom events through the event bus', () => {
                const kernel = configureKernel({ namespace: 'acme' });
                const payload = { foo: 'bar' };
                const bus = getKernelEventBus();
                const emitSpy = jest.spyOn(bus, 'emit');

                kernel.emit('wpk.event', payload);

                expect(emitSpy).toHaveBeenCalledWith('custom:event', {
                        eventName: 'wpk.event',
                        payload,
                });
        });

	it('throws KernelError when emit is called with invalid event name', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		expect(() => kernel.emit('', {})).toThrow(KernelError);
	});

        it('reports UI disabled state by default', () => {
                const kernel = configureKernel({ namespace: 'acme' });

                expect(kernel.ui.isEnabled()).toBe(false);
        });

        it('exposes the shared event bus on the kernel instance', () => {
                const kernel = configureKernel({ namespace: 'acme' });
                const bus = getKernelEventBus();

                expect(kernel.events).toBe(bus);
        });
});
