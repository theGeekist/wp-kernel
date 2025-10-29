import { createCapabilityCache, createCapabilityCacheKey } from '../cache';
import { WPK_SUBSYSTEM_NAMESPACES } from '../../contracts';

jest.mock('../../namespace/detect', () => ({
	getNamespace: () => 'acme',
}));

type BroadcastMessage =
	| {
			type: 'set';
			namespace: string;
			key: string;
			value: boolean;
			expiresAt: number;
	  }
	| { type: 'invalidate'; namespace: string; capabilityKey?: string }
	| { type: 'clear'; namespace: string };

class MockBroadcastChannel {
	public static instances: MockBroadcastChannel[] = [];

	public messages: BroadcastMessage[] = [];

	public onmessage: ((event: MessageEvent<BroadcastMessage>) => void) | null =
		null;

	public constructor(public readonly name: string) {
		MockBroadcastChannel.instances.push(this);
	}

	public postMessage(message: BroadcastMessage) {
		this.messages.push(message);
	}

	public close() {
		// noop for tests
	}
}

describe('createCapabilityCache', () => {
	const storageKey = 'wpk.capability.cache.acme';
	const originalBroadcastChannel = global.window.BroadcastChannel;
	const originalSessionStorage = global.window.sessionStorage;

	beforeEach(() => {
		jest.restoreAllMocks();
		MockBroadcastChannel.instances = [];
		window.sessionStorage.clear();
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: MockBroadcastChannel,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: originalBroadcastChannel,
		});
		Object.defineProperty(window, 'sessionStorage', {
			configurable: true,
			value: originalSessionStorage,
		});
	});

	it('creates stable cache keys for complex params', () => {
		const key = createCapabilityCacheKey('capability', {
			beta: 2,
			alpha: [{ nested: true }, 3],
			nullable: null,
		});

		expect(key).toBe(
			'capability::{"alpha":[{"nested":true},3],"beta":2,"nullable":null}'
		);
	});

	it('hydrates persisted session storage entries', () => {
		const expiresAt = Date.now() + 1000;
		window.sessionStorage.setItem(
			storageKey,
			JSON.stringify({
				'capability::void': { value: true, expiresAt },
			})
		);

		const cache = createCapabilityCache({ storage: 'session' }, 'acme');
		expect(cache.get('capability::void')).toBe(true);
		expect(cache.keys()).toEqual(['capability::void']);
	});

	it('guards against invalid persisted data', () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		window.sessionStorage.setItem(storageKey, '{invalid json');

		const cache = createCapabilityCache({ storage: 'session' }, 'acme');
		expect(cache.keys()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE}]`,
			'Failed to parse persisted capability cache.',
			expect.any(SyntaxError)
		);
		expect(console as any).toHaveWarned();
	});

	it('persists values and surfaces storage errors', () => {
		const store = new Map<string, string>();
		const setItem = jest.fn((key: string, value: string) => {
			store.set(key, value);
		});
		const getItem = jest.fn(() => null);
		const customStorage = { getItem, setItem } as unknown as Storage;
		Object.defineProperty(window, 'sessionStorage', {
			configurable: true,
			value: customStorage,
		});

		const cache = createCapabilityCache({ storage: 'session' }, 'acme');
		cache.set('capability::void', true);
		expect(setItem).toHaveBeenCalledTimes(1);
		const persisted = JSON.parse(store.get(storageKey) ?? '{}');
		expect(persisted['capability::void'].value).toBe(true);

		const error = new Error('persist failed');
		setItem.mockImplementationOnce(() => {
			throw error;
		});
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		cache.set('capability::void', false);
		expect(warn).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE}]`,
			'Failed to persist capability cache.',
			error
		);
		expect(console as any).toHaveWarned();
	});

	it('handles session storage access failures gracefully', () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		Object.defineProperty(window, 'sessionStorage', {
			configurable: true,
			get() {
				throw new Error('blocked');
			},
		});

		const cache = createCapabilityCache({ storage: 'session' }, 'acme');
		expect(cache.keys()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE}]`,
			'sessionStorage is not available for capability cache.',
			expect.any(Error)
		);
		expect(console as any).toHaveWarned();
	});

	it('evicts expired entries based on ttl', () => {
		jest.useFakeTimers();
		jest.setSystemTime(0);
		const cache = createCapabilityCache({}, 'acme');
		cache.set('capability::void', true, { ttlMs: 50 });
		expect(cache.get('capability::void')).toBe(true);
		jest.advanceTimersByTime(51);
		expect(cache.get('capability::void')).toBeUndefined();
		expect(cache.keys()).toEqual([]);
		jest.useRealTimers();
	});

	it('broadcasts local mutations and handles remote updates', () => {
		const cache = createCapabilityCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		const listener = jest.fn();
		const unsubscribe = cache.subscribe(listener);

		cache.set('capability::void', true);
		expect(channel.messages[0]).toMatchObject({
			type: 'set',
			namespace: 'acme',
			key: 'capability::void',
			value: true,
		});
		expect(cache.getSnapshot()).toBe(1);

		channel.onmessage?.({
			data: {
				type: 'set',
				namespace: 'acme',
				key: 'capability::user',
				value: false,
				expiresAt: Date.now() + 1000,
			},
		} as MessageEvent<BroadcastMessage>);
		expect(cache.get('capability::user')).toBe(false);
		expect(listener).toHaveBeenCalled();

		channel.onmessage?.({
			data: {
				type: 'invalidate',
				namespace: 'acme',
				capabilityKey: 'capability',
			},
		} as MessageEvent<BroadcastMessage>);
		expect(cache.keys()).toEqual([]);

		cache.set('capability::void', true);
		channel.onmessage?.({
			data: { type: 'clear', namespace: 'acme' },
		} as MessageEvent<BroadcastMessage>);
		expect(cache.keys()).toEqual([]);

		channel.onmessage?.({
			data: {
				type: 'invalidate',
				namespace: 'other',
				capabilityKey: 'capability',
			},
		} as MessageEvent<BroadcastMessage>);
		expect(cache.keys()).toEqual([]);

		unsubscribe();
	});

	it('supports remote writes without re-broadcasting', () => {
		const cache = createCapabilityCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		cache.set('capability::void', true, {
			source: 'remote',
			expiresAt: Date.now() + 10,
		});
		expect(channel.messages).toHaveLength(0);
	});

	it('invalidates namespaces and specific capabilities', () => {
		const cache = createCapabilityCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		cache.set('foo::void', true);
		cache.set('bar::void', true);
		cache.invalidate('foo');
		expect(cache.keys()).toEqual(['bar::void']);
		expect(channel.messages).toContainEqual({
			type: 'invalidate',
			namespace: 'acme',
			capabilityKey: 'foo',
		});

		cache.invalidate();
		expect(cache.keys()).toEqual([]);
		expect(channel.messages).toContainEqual({
			type: 'clear',
			namespace: 'acme',
		});
		const previous = channel.messages.length;
		cache.invalidate('missing');
		expect(channel.messages).toHaveLength(previous);
	});

	it('skips broadcast channel creation when disabled and logs failures', () => {
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: undefined,
		});
		const cacheWithoutChannel = createCapabilityCache(
			{ crossTab: false },
			'acme'
		);
		cacheWithoutChannel.set('capability::void', true);

		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: jest.fn(() => {
				throw new Error('channel fail');
			}),
		});
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const cache = createCapabilityCache({}, 'acme');
		expect(warn).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE}]`,
			'Failed to create BroadcastChannel for capability cache.',
			expect.any(Error)
		);
		expect(console as any).toHaveWarned();
		cache.set('capability::void', true);
	});

	it('clears cache without listeners and respects remote expiry overrides', () => {
		const cache = createCapabilityCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		expect(cache.get('missing')).toBeUndefined();
		cache.set('capability::void', true, {
			expiresAt: Date.now() + 500,
			source: 'remote',
		});
		cache.clear();
		expect(channel.messages).toContainEqual({
			type: 'clear',
			namespace: 'acme',
		});
	});

	it('ignores persisted structures that are not plain objects', () => {
		window.sessionStorage.setItem(storageKey, '"text"');
		const cache = createCapabilityCache({ storage: 'session' }, 'acme');
		expect(cache.keys()).toEqual([]);
	});
});
