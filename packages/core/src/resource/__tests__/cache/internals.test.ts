import type { KernelRegistry } from '../../../data/types';
import {
	invalidate,
	invalidateAll,
	registerStoreKey,
	type CacheKeyPattern,
} from '../../cache';
import { KernelEventBus, setKernelEventBus } from '../../../events/bus';
import { clearKernelReporter } from '../../../reporter';

type LogEntry = {
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	context?: unknown;
};

type ReporterSpy = {
	reporter: {
		info: jest.Mock<void, [string, unknown?]>;
		warn: jest.Mock<void, [string, unknown?]>;
		error: jest.Mock<void, [string, unknown?]>;
		debug: jest.Mock<void, [string, unknown?]>;
		child: () => ReporterSpy['reporter'];
	};
	logs: LogEntry[];
};

function createReporterSpy(): ReporterSpy {
	const logs: LogEntry[] = [];
	const reporter = {
		info: jest.fn<void, [string, unknown?]>((message, context) => {
			logs.push({ level: 'info', message, context });
		}),
		warn: jest.fn<void, [string, unknown?]>((message, context) => {
			logs.push({ level: 'warn', message, context });
		}),
		error: jest.fn<void, [string, unknown?]>((message, context) => {
			logs.push({ level: 'error', message, context });
		}),
		debug: jest.fn<void, [string, unknown?]>((message, context) => {
			logs.push({ level: 'debug', message, context });
		}),
		child: () => reporter,
	} as ReporterSpy['reporter'];

	return { reporter, logs };
}

describe('resource cache internals', () => {
	let dispatch: jest.Mock;
	let select: jest.Mock;
	let registry: KernelRegistry;
	let bus: KernelEventBus;
	let originalNodeEnv: string | undefined;

	beforeEach(() => {
		dispatch = jest.fn();
		select = jest.fn();
		registry = {
			dispatch,
			select,
		} as unknown as KernelRegistry;
		bus = new KernelEventBus();
		setKernelEventBus(bus);
		clearKernelReporter();
		originalNodeEnv = process.env.NODE_ENV;
	});

	afterEach(() => {
		setKernelEventBus(new KernelEventBus());
		clearKernelReporter();
		process.env.NODE_ENV = originalNodeEnv;
		jest.clearAllMocks();
	});

	it('maps normalized keys back to raw store keys and invalidates resolvers', () => {
		const storeKey = 'wpk/thing';
		registerStoreKey(storeKey);

		const invalidateSpy = jest.fn();
		const invalidateResolutionSpy = jest.fn();
		const getInternalState = jest.fn(() => ({
			lists: {
				active: [1, 2],
				'status:archived': [3],
			},
			listMeta: {
				'status:archived': { total: 0 },
			},
			errors: {
				'thing:item:123': 'boom',
			},
		}));

		dispatch.mockReturnValue({
			invalidate: invalidateSpy,
			invalidateResolution: invalidateResolutionSpy,
		});
		select.mockReturnValue({ __getInternalState: getInternalState });

		const { reporter, logs } = createReporterSpy();
		const listener = jest.fn();
		bus.on('cache:invalidated', listener);

		const patterns: CacheKeyPattern[] = [
			['thing', 'list'],
			['thing', 'item', 123],
		];

		invalidate(patterns, {
			registry,
			reporter,
			namespace: 'tests',
			resourceName: 'thing',
		});

		expect(invalidateSpy).toHaveBeenCalledWith([
			'active',
			'status:archived',
			'thing:item:123',
		]);
		expect(invalidateResolutionSpy).toHaveBeenNthCalledWith(1, 'getList');
		expect(invalidateResolutionSpy).toHaveBeenNthCalledWith(2, 'getItem');

		expect(listener).toHaveBeenCalledWith({
			keys: expect.arrayContaining([
				'thing:list:active',
				'thing:list:status:archived',
				'thing:item:123',
			]),
		});

		const summaryLog = logs.find(
			(entry) =>
				entry.level === 'info' &&
				entry.message === 'cache.invalidate.summary'
		);
		expect(summaryLog?.context).toMatchObject({
			invalidatedKeys: expect.arrayContaining([
				'thing:list:active',
				'thing:list:status:archived',
				'thing:item:123',
			]),
		});
	});

	it('warns when stores omit __getInternalState in development', () => {
		process.env.NODE_ENV = 'development';
		const storeKey = 'wpk/policy-less';
		registerStoreKey(storeKey);

		const invalidateSpy = jest.fn();
		dispatch.mockReturnValue({ invalidate: invalidateSpy });
		select.mockReturnValue({});

		const { reporter, logs } = createReporterSpy();

		invalidate(['policy-less', 'list'], {
			registry,
			reporter,
			storeKey,
		});

		expect(invalidateSpy).not.toHaveBeenCalled();
		const warning = logs.find(
			(entry) =>
				entry.level === 'warn' &&
				entry.message === 'cache.store.missingState'
		);
		expect(warning?.context).toEqual({ storeKey });
	});

	it('invalidates entire store via invalidateAll', () => {
		const storeKey = 'wpk/everything';
		registerStoreKey(storeKey);

		const invalidateAllSpy = jest.fn();
		dispatch.mockReturnValue({ invalidateAll: invalidateAllSpy });

		const { reporter, logs } = createReporterSpy();
		const listener = jest.fn();
		bus.on('cache:invalidated', listener);

		invalidateAll(storeKey, registry, reporter);

		expect(invalidateAllSpy).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({ keys: [`${storeKey}:*`] });

		const debugLog = logs.find(
			(entry) =>
				entry.level === 'debug' &&
				entry.message === 'cache.invalidate.all'
		);
		expect(debugLog?.context).toEqual({ storeKey });

		const summaryLog = logs.find(
			(entry) =>
				entry.level === 'info' &&
				entry.message === 'cache.invalidate.summary'
		);
		expect(summaryLog?.context).toEqual({
			storeKey,
			invalidatedKeys: [`${storeKey}:*`],
		});
	});
});
