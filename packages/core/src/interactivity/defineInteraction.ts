/**
 * Interactivity helper - defineInteraction implementation.
 *
 * This module wires WP Kernel resources and actions into the WordPress
 * interactivity runtime so UI bindings can hydrate server state and dispatch
 * actions without coupling to transport concerns.
 *
 * ```typescript
 * import { defineInteraction } from '@wpkernel/core/interactivity';
 * import { post } from '@/resources/post';
 * import { UpdatePost } from '@/actions/UpdatePost';
 *
 * export const PostPreview = defineInteraction({
 *   resource: post,
 *   feature: 'preview',
 *   actions: {
 *     update: UpdatePost,
 *   },
 * });
 *
 * PostPreview.store.actions.update({ id: 42, title: 'Updated' });
 * ```
 *
 * @module @wpkernel/core/interactivity/defineInteraction
 */

import { invokeAction } from '../actions/middleware';
import type { ActionEnvelope } from '../actions/middleware';
import type { DefinedAction } from '../actions/types';
import type { WPKernelRegistry } from '../data/types';
import { registerWPKernelStore } from '../data/store';
import { WPKernelError } from '../error/WPKernelError';
import { WPK_NAMESPACE } from '../contracts/index';
import type { ResourceObject, ResourceState } from '../resource/types';
import type {
	DefineInteractionOptions,
	DefinedInteraction,
	HydrateServerStateInput,
	InteractionActionInput,
	InteractionActionMetaResolver,
	InteractionActionsRecord,
	InteractionActionsRuntime,
	InteractivityGlobal,
	InteractivityModule,
	InteractivityStoreResult,
	InteractivityServerState,
	InvokeDispatch,
	ResourceCacheSync,
	ResourceDispatcher,
	ResourceSnapshotItems,
} from './types';

let cachedInteractivityModule: InteractivityModule | undefined;

/**
 * Resolve the WordPress interactivity runtime from the global scope.
 */
function resolveInteractivityModule(): InteractivityModule {
	const globalTarget = globalThis as InteractivityGlobal;

	const stub = globalTarget.__WPKernelInteractivityStub;
	if (stub) {
		cachedInteractivityModule = stub;
		return stub;
	}

	const runtime = globalTarget.wp?.interactivity;
	if (runtime) {
		cachedInteractivityModule = runtime;
		return runtime;
	}

	if (cachedInteractivityModule) {
		return cachedInteractivityModule;
	}

	throw new WPKernelError('DeveloperError', {
		message:
			'defineInteraction requires the WordPress interactivity runtime. Ensure @wordpress/interactivity is loaded before calling this helper.',
	});
}

const ACTION_STORE_KEY = 'wp-kernel/ui/actions';
const ACTION_STORE_MARKER = Symbol.for('wpWPKernelUIActionStoreRegistered');

function normalizeSegment(value: string, fallback: string): string {
	const cleaned = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');

	return cleaned || fallback;
}

type ActionStoreRegistry = WPKernelRegistry & {
	[ACTION_STORE_MARKER]?: boolean;
};

function resolveRegistry(
	provided?: WPKernelRegistry
): WPKernelRegistry | undefined {
	if (provided) {
		return provided;
	}

	const globalAccessor = (
		globalThis as {
			getWPData?: () => unknown;
		}
	).getWPData;

	if (typeof globalAccessor === 'function') {
		return globalAccessor() as WPKernelRegistry | undefined;
	}

	return undefined;
}

function ensureActionStoreRegistered(registry: WPKernelRegistry): void {
	const typedRegistry = registry as ActionStoreRegistry;
	if (typedRegistry[ACTION_STORE_MARKER]) {
		return;
	}

	const storeConfig = {
		reducer: (state: Record<string, unknown> | undefined) => state ?? {},
		actions: {
			invoke: (...args: unknown[]) =>
				args[0] as ActionEnvelope<unknown, unknown>,
		},
		selectors: {},
	} satisfies {
		reducer: (
			state: Record<string, unknown> | undefined
		) => Record<string, unknown>;
		actions: {
			invoke: (...args: unknown[]) => ActionEnvelope<unknown, unknown>;
		};
		selectors: Record<string, never>;
	};

	try {
		if (typeof typedRegistry.registerStore === 'function') {
			typedRegistry.registerStore(ACTION_STORE_KEY, storeConfig);
		} else {
			registerWPKernelStore(ACTION_STORE_KEY, storeConfig);
		}
	} catch (error) {
		const alreadyRegistered =
			error instanceof Error &&
			error.message.includes('already registered');
		if (!alreadyRegistered) {
			throw error;
		}
	}

	typedRegistry[ACTION_STORE_MARKER] = true;
}

function resolveActionDispatcher(registry: WPKernelRegistry): InvokeDispatch {
	ensureActionStoreRegistered(registry);

	const dispatcher = registry.dispatch?.(ACTION_STORE_KEY) as
		| {
				invoke?: (
					envelope: ActionEnvelope<unknown, unknown>
				) => Promise<unknown>;
		  }
		| undefined;

	const invoke = dispatcher?.invoke;
	if (typeof invoke !== 'function') {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineInteraction requires the WordPress data registry to expose an invoke() action. Call configureWPKernel() with a registry before binding interactivity helpers.',
		});
	}

	return <TArgs, TResult>(
		envelope: ActionEnvelope<TArgs, TResult>
	): Promise<TResult> =>
		Promise.resolve(
			invoke(envelope as ActionEnvelope<unknown, unknown>)
		) as Promise<TResult>;
}

function buildDefaultNamespace<TEntity, TQuery>(
	resource: ResourceObject<TEntity, TQuery>,
	feature: string
): string {
	const resourceSegment = normalizeSegment(
		resource.storeKey.split('/').pop() ?? resource.name ?? 'resource',
		'resource'
	);
	const featureSegment = normalizeSegment(feature, '');

	if (!featureSegment) {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineInteraction feature name must include alphanumeric characters.',
		});
	}

	return `${WPK_NAMESPACE}/${resourceSegment}/${featureSegment}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object';
}

function isResourceCacheSnapshot<TEntity>(
	value: unknown
): value is Partial<ResourceState<TEntity>> {
	if (!isRecord(value)) {
		return false;
	}

	const hasItems =
		!('items' in value) ||
		isRecord((value as Partial<ResourceState<TEntity>>).items);
	const hasLists =
		!('lists' in value) ||
		isRecord((value as Partial<ResourceState<TEntity>>).lists);
	const hasErrors =
		!('errors' in value) ||
		isRecord((value as Partial<ResourceState<TEntity>>).errors);

	return hasItems && hasLists && hasErrors;
}

function extractResourceCacheSnapshot<TEntity>(
	serverState: InteractivityServerState
): Partial<ResourceState<TEntity>> | null {
	if (!isRecord(serverState)) {
		return null;
	}

	const candidate = (
		serverState as {
			resourceCache?: unknown;
		}
	).resourceCache;

	if (isResourceCacheSnapshot<TEntity>(candidate)) {
		return candidate;
	}

	if (isResourceCacheSnapshot<TEntity>(serverState)) {
		return serverState as Partial<ResourceState<TEntity>>;
	}

	return null;
}

function getResourceDispatcher<TEntity, TQuery>(
	registry: WPKernelRegistry,
	resource: ResourceObject<TEntity, TQuery>
): ResourceDispatcher<TEntity> {
	return registry.dispatch?.(
		resource.storeKey
	) as ResourceDispatcher<TEntity>;
}

function forwardResourceItems<TEntity>(
	dispatcher: ResourceDispatcher<TEntity>,
	items: ResourceSnapshotItems<TEntity>
): void {
	const receiveItem = dispatcher?.receiveItem;
	if (!receiveItem) {
		return;
	}

	for (const item of Object.values(items)) {
		if (item !== undefined) {
			receiveItem(item as TEntity);
		}
	}
}

function forwardResourceLists<TEntity>(
	dispatcher: ResourceDispatcher<TEntity>,
	snapshot: Partial<ResourceState<TEntity>>,
	items: ResourceSnapshotItems<TEntity>
): void {
	const receiveItems = dispatcher?.receiveItems;
	const lists = snapshot.lists;
	if (!receiveItems || !lists) {
		return;
	}

	for (const [queryKey, ids] of Object.entries(lists)) {
		const resolvedIds = ids ?? [];
		const entities = resolvedIds
			.map((id) => items[id as keyof typeof items])
			.filter((entry): entry is TEntity => entry !== undefined);
		const meta = snapshot.listMeta?.[queryKey];
		receiveItems(queryKey, entities, meta);
	}
}

function forwardResourceErrors<TEntity>(
	dispatcher: ResourceDispatcher<TEntity>,
	errors: Partial<ResourceState<TEntity>>['errors']
): void {
	const receiveError = dispatcher?.receiveError;
	if (!receiveError || !errors) {
		return;
	}

	for (const [key, error] of Object.entries(errors)) {
		if (typeof error === 'string') {
			receiveError(key, error);
		}
	}
}

function hydrateResourceCache<TEntity, TQuery>(
	resource: ResourceObject<TEntity, TQuery>,
	registry: WPKernelRegistry,
	snapshot: Partial<ResourceState<TEntity>>
): void {
	void resource.store;
	const dispatcher = getResourceDispatcher(registry, resource);

	if (!dispatcher) {
		return;
	}

	const items = (snapshot.items ?? {}) as ResourceSnapshotItems<TEntity>;

	forwardResourceItems(dispatcher, items);
	forwardResourceLists(dispatcher, snapshot, items);
	forwardResourceErrors(dispatcher, snapshot.errors);
}

type NormalizedActionBinding<TArgs, TResult> = {
	readonly action: DefinedAction<TArgs, TResult>;
	readonly meta?: InteractionActionMetaResolver<TArgs>;
};

function normalizeActionBinding<TArgs, TResult>(
	input: InteractionActionInput<TArgs, TResult>
): NormalizedActionBinding<TArgs, TResult> {
	if (typeof input === 'function') {
		return { action: input };
	}

	const meta = input.meta;
	if (!meta) {
		return { action: input.action };
	}

	const metaResolver: InteractionActionMetaResolver<TArgs> =
		typeof meta === 'function' ? meta : () => meta;

	return { action: input.action, meta: metaResolver };
}

function bindInteractionActions<TActions extends InteractionActionsRecord>(
	actions: TActions,
	dispatcher: InvokeDispatch
): InteractionActionsRuntime<TActions> {
	const bound = {} as InteractionActionsRuntime<TActions>;

	for (const key of Object.keys(actions) as Array<keyof TActions>) {
		const binding = actions[key];
		const normalized = normalizeActionBinding(
			binding as InteractionActionInput<unknown, unknown>
		);

		bound[key] = ((args: unknown) => {
			const meta = normalized.meta?.(args as unknown);
			const envelope = invokeAction(
				normalized.action as DefinedAction<unknown, unknown>,
				args as unknown,
				meta ?? {}
			);
			return dispatcher(envelope as ActionEnvelope<unknown, unknown>);
		}) as InteractionActionsRuntime<TActions>[typeof key];
	}

	return bound;
}

function mergeStoreDefinition<
	TStore extends Record<string, unknown>,
	TActions extends InteractionActionsRecord,
>(
	store: TStore | undefined,
	bound: InteractionActionsRuntime<TActions>
): Record<string, unknown> {
	const definition: Record<string, unknown> = {
		...(store ?? {}),
	};

	if ('actions' in definition) {
		delete definition.actions;
	}

	const existingActions =
		(store?.actions as Record<string, unknown> | undefined) ?? {};
	const mergedActions = {
		...existingActions,
		...bound,
	};

	if (Object.keys(mergedActions).length > 0) {
		definition.actions = mergedActions;
	}

	return definition;
}

function assertActionsBindable<
	TActions extends InteractionActionsRecord | undefined,
>(actions: TActions, registry: WPKernelRegistry | undefined): void {
	if (
		!actions ||
		Object.keys(actions as Record<string, unknown>).length === 0 ||
		registry
	) {
		return;
	}

	throw new WPKernelError('DeveloperError', {
		message:
			'defineInteraction cannot bind actions without a WordPress data registry. Pass a registry or call configureWPKernel() first.',
	});
}

function buildCacheSynchronizer<TEntity, TQuery>(
	resource: ResourceObject<TEntity, TQuery>,
	registry: WPKernelRegistry | undefined
): ResourceCacheSync<TEntity> {
	if (!registry) {
		return () => undefined;
	}

	return (snapshot) => {
		hydrateResourceCache(resource, registry, snapshot);
	};
}

function buildServerStateSynchronizer<TEntity, TQuery>(
	namespace: string,
	resource: ResourceObject<TEntity, TQuery>,
	registry: WPKernelRegistry | undefined,
	interactivity: InteractivityModule,
	syncCache: ResourceCacheSync<TEntity>,
	autoHydrate: boolean | undefined,
	hydrateServerState?: (
		input: HydrateServerStateInput<TEntity, TQuery>
	) => void
): () => void {
	return () => {
		const serverState = interactivity.getServerState(namespace);

		if (hydrateServerState) {
			hydrateServerState({
				serverState,
				resource,
				registry,
				syncCache,
			});
			return;
		}

		if (!registry || autoHydrate === false) {
			return;
		}

		const snapshot = extractResourceCacheSnapshot<TEntity>(serverState);
		if (snapshot) {
			syncCache(snapshot);
		}
	};
}

/**
 * Define an interactivity store that bridges a resource and optional actions to
 * the WordPress interactivity runtime.
 *
 * The helper automatically derives a namespaced store key, registers the
 * provided store configuration with WordPress, and synchronizes the resource
 * cache when server state is available.
 *
 * ```typescript
 * import { defineInteraction } from '@wpkernel/core/interactivity';
 * import { testimonial } from '@/resources/testimonial';
 * import { ApproveTestimonial } from '@/actions/ApproveTestimonial';
 *
 * const TestimonialReview = defineInteraction({
 *   resource: testimonial,
 *   feature: 'review',
 *   actions: {
 *     approve: ApproveTestimonial,
 *   },
 * });
 *
 * await TestimonialReview.store.actions.approve({ id: 101 });
 * ```
 * @param    options
 * @category Interactivity
 */
export function defineInteraction<
	TEntity,
	TQuery,
	TStore extends Record<string, unknown> = Record<string, unknown>,
	TActions extends InteractionActionsRecord = InteractionActionsRecord,
>(
	options: DefineInteractionOptions<TEntity, TQuery, TStore, TActions>
): DefinedInteraction<InteractivityStoreResult> {
	const {
		resource,
		feature,
		store,
		actions,
		registry: explicitRegistry,
		namespace: explicitNamespace,
		autoHydrate = true,
		hydrateServerState,
	} = options;

	if (!resource) {
		throw new WPKernelError('DeveloperError', {
			message: 'defineInteraction requires a resource definition.',
		});
	}

	const namespace =
		explicitNamespace ?? buildDefaultNamespace(resource, feature);
	const registry = resolveRegistry(explicitRegistry);
	const interactivity = resolveInteractivityModule();

	assertActionsBindable(actions, registry);

	const boundActions =
		actions && registry
			? bindInteractionActions(actions, resolveActionDispatcher(registry))
			: ({} as InteractionActionsRuntime<TActions>);

	const storeDefinition = mergeStoreDefinition(store, boundActions);
	const storeResult = interactivity.store(namespace, storeDefinition);

	const syncCache = buildCacheSynchronizer(resource, registry);

	const syncServerState = buildServerStateSynchronizer(
		namespace,
		resource,
		registry,
		interactivity,
		syncCache,
		autoHydrate,
		hydrateServerState
	);

	if (registry && (autoHydrate !== false || hydrateServerState)) {
		syncServerState();
	}

	return {
		namespace,
		store: storeResult,
		syncServerState,
		getServerState: () => interactivity.getServerState(namespace),
	};
}
