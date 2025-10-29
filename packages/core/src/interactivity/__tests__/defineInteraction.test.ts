import { defineInteraction } from '../defineInteraction';
import type { DefinedAction } from '../../actions/types';
import { defineResource } from '../../resource/define';
import type { ResourceObject } from '../../resource/types';
import type { WPKernelRegistry } from '../../data/types';
import type * as WPInteractivity from '@wordpress/interactivity';

type WPInteractivityModule = typeof WPInteractivity;

function getInteractivity(): jest.Mocked<WPInteractivityModule> {
	const stub = (
		globalThis as {
			__WPKernelInteractivityStub?: WPInteractivityModule;
		}
	).__WPKernelInteractivityStub;

	if (!stub) {
		throw new Error('Interactivity stub not initialised');
	}

	return jest.mocked(stub);
}

function createRegistryMock(): WPKernelRegistry {
	const registry = {
		dispatch: jest.fn(),
		__experimentalUseMiddleware: jest.fn(),
	} as Partial<WPKernelRegistry>;
	return registry as WPKernelRegistry;
}

function createStubAction<TArgs, TResult>(
	name: string
): DefinedAction<TArgs, TResult> {
	const fn = jest.fn(async (_args: TArgs) => undefined as unknown as TResult);
	return Object.assign(fn, {
		actionName: name,
		options: { scope: 'crossTab' as const, bridged: true },
	}) as DefinedAction<TArgs, TResult>;
}

describe('defineInteraction', () => {
	beforeEach(() => {
		const interactivity = getInteractivity();
		interactivity.store.mockClear();
		interactivity.getServerState.mockReset();
		interactivity.getServerState.mockReturnValue({});
	});

	function createResource(): ResourceObject<{ id: number }, unknown> {
		return defineResource<{ id: number }>({
			name: 'test-item',
			routes: {
				list: { method: 'GET', path: '/test/v1/items' },
			},
		});
	}

	it('derives the default namespace and registers bound actions', async () => {
		const resource = createResource();
		const registry = createRegistryMock();
		const invoke = jest.fn().mockResolvedValue('ok');

		registry.dispatch = jest.fn((key: string) => {
			if (key === 'wp-kernel/ui/actions') {
				return { invoke };
			}
			if (key === resource.storeKey) {
				return {};
			}
			return {};
		}) as unknown as WPKernelRegistry['dispatch'];

		const stubAction = createStubAction<{ value: number }, number>(
			'Test.Run'
		);

		const interaction = defineInteraction({
			resource,
			feature: 'preview',
			actions: { run: stubAction as DefinedAction<unknown, unknown> },
			registry,
		});

		expect(interaction.namespace).toBe('wpk/test-item/preview');
		const interactivity = getInteractivity();
		expect(interactivity.store).toHaveBeenCalledWith(
			'wpk/test-item/preview',
			expect.objectContaining({
				actions: expect.objectContaining({ run: expect.any(Function) }),
			})
		);

		const boundAction = (
			interactivity.store.mock.results[0]?.value as {
				actions?: {
					run?: (input: { value: number }) => Promise<number>;
				};
			}
		)?.actions?.run;

		expect(boundAction).toBeDefined();
		await boundAction?.({ value: 2 });
		expect(invoke).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: expect.objectContaining({ action: stubAction }),
			})
		);
	});

	it('hydrates resource caches from server state snapshots', () => {
		const resource = createResource();
		const registry = createRegistryMock();

		const receiveItem = jest.fn();
		const receiveItems = jest.fn();
		const receiveError = jest.fn();

		registry.dispatch = jest.fn((key: string) => {
			if (key === 'wp-kernel/ui/actions') {
				return { invoke: jest.fn().mockResolvedValue(undefined) };
			}
			if (key === resource.storeKey) {
				return {
					receiveItem,
					receiveItems,
					receiveError,
				};
			}
			return {};
		}) as unknown as WPKernelRegistry['dispatch'];

		const serverState = {
			items: {
				1: { id: 1, title: 'First' },
			},
			lists: {
				all: [1],
			},
			listMeta: {
				all: { status: 'success' },
			},
			errors: {
				'wpk/test-item:get:2': 'Failed',
			},
		} satisfies Record<string, unknown>;

		const interactivity = getInteractivity();
		interactivity.getServerState.mockReturnValue(serverState);

		const interaction = defineInteraction({
			resource,
			feature: 'hydrate',
			registry,
		});

		interaction.syncServerState();

		expect(receiveItem).toHaveBeenCalledWith({ id: 1, title: 'First' });
		expect(receiveItems).toHaveBeenCalledWith(
			'all',
			[{ id: 1, title: 'First' }],
			{ status: 'success' }
		);
		expect(receiveError).toHaveBeenCalledWith(
			'wpk/test-item:get:2',
			'Failed'
		);
	});

	it('supports custom hydration callbacks', () => {
		const resource = createResource();
		const registry = createRegistryMock();
		const customHydrate = jest.fn();

		registry.dispatch = jest.fn((key: string) => {
			if (key === 'wp-kernel/ui/actions') {
				return { invoke: jest.fn().mockResolvedValue(undefined) };
			}
			return {};
		}) as unknown as WPKernelRegistry['dispatch'];

		const serverState = { custom: true };
		const interactivity = getInteractivity();
		interactivity.getServerState.mockReturnValue(serverState);

		const interaction = defineInteraction({
			resource,
			feature: 'custom',
			registry,
			hydrateServerState: customHydrate,
		});

		interaction.syncServerState();

		expect(customHydrate).toHaveBeenCalledWith(
			expect.objectContaining({
				serverState,
				resource,
				registry,
				syncCache: expect.any(Function),
			})
		);
	});
});
