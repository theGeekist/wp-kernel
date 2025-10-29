import { createHelper } from '../../helper';
import { WPKernelError } from '../../../error/WPKernelError';
import { registerStoreKey, unregisterStoreKey } from '../../../resource/cache';
import {
	getWPKernelEventBus,
	recordResourceDefined,
	removeRecordedResource,
} from '../../../events/bus';
import { WPK_INFRASTRUCTURE } from '../../../contracts/index.js';
import { RESOURCE_LOG_MESSAGES } from '../../../resource/logMessages';
import type { Reporter } from '../../../reporter/types';
import type {
	ResourceBuilderHelper,
	ResourceBuilderInput,
	ResourceBuilderKind,
	ResourcePipelineArtifact,
	ResourcePipelineContext,
	ResourcePipelineSideEffects,
} from '../types';
import { RESOURCE_BUILDER_KIND } from '../types';
import type { ResourceDefinedEvent } from '../../../events/bus';
import type { ResourceObject } from '../../../resource/types';

type BroadcastStatus = 'committed' | 'rolled-back';

type BroadcastChannelConstructor = new (name: string) => BroadcastChannel;

interface BroadcastPayload {
	readonly namespace: string;
	readonly resourceName: string;
	readonly storeKey: string;
	readonly status: BroadcastStatus;
}

function ensureSideEffects<T, TQuery>(
	artifact: ResourcePipelineArtifact<T, TQuery>
): ResourcePipelineSideEffects {
	if (artifact.sideEffects) {
		return artifact.sideEffects;
	}

	const tasks: ResourcePipelineSideEffects = {
		commits: [],
		rollbacks: [],
	};

	artifact.sideEffects = tasks;
	return tasks;
}

function getBroadcastChannelConstructor():
	| BroadcastChannelConstructor
	| undefined {
	if (
		typeof window !== 'undefined' &&
		typeof window.BroadcastChannel === 'function'
	) {
		return window.BroadcastChannel;
	}

	if (typeof globalThis.BroadcastChannel === 'function') {
		return globalThis.BroadcastChannel;
	}

	return undefined;
}

function postResourceBroadcast({
	payload,
	reporter,
}: {
	readonly payload: BroadcastPayload;
	readonly reporter: Reporter;
}): void {
	const BroadcastChannelCtor = getBroadcastChannelConstructor();
	if (!BroadcastChannelCtor) {
		return;
	}

	let channel: BroadcastChannel | null = null;

	try {
		channel = new BroadcastChannelCtor(
			WPK_INFRASTRUCTURE.RESOURCES_CHANNEL
		);
		channel.postMessage({
			type: WPK_INFRASTRUCTURE.RESOURCES_MESSAGE_TYPE_DEFINED,
			payload,
		});
	} catch (error) {
		reporter.warn(RESOURCE_LOG_MESSAGES.broadcastFailure, {
			error,
			status: payload.status,
			namespace: payload.namespace,
			resource: payload.resourceName,
		});
	} finally {
		channel?.close?.();
	}
}

function assertResourceMetadata<T, TQuery>(
	artifact: ResourcePipelineArtifact<T, TQuery>,
	context: ResourcePipelineContext<T, TQuery>
): {
	namespace: string;
	resourceName: string;
	storeKey: string;
} {
	const namespace = artifact.namespace ?? context.namespace;
	if (!namespace) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource registry recording requires a namespace. Ensure resource.namespace.resolve runs first.',
		});
	}

	const resourceName = artifact.resourceName ?? context.resourceName;
	if (!resourceName) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource registry recording requires a resource name. Ensure resource.namespace.resolve runs first.',
		});
	}

	const storeKey = artifact.storeKey ?? context.storeKey;
	if (!storeKey) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource registry recording requires a store key. Ensure resource.namespace.resolve runs first.',
		});
	}

	return { namespace, resourceName, storeKey };
}

export function buildResourceRegistryRecorder<
	T,
	TQuery,
>(): ResourceBuilderHelper<T, TQuery> {
	return createHelper<
		ResourcePipelineContext<T, TQuery>,
		ResourceBuilderInput<T, TQuery>,
		ResourcePipelineArtifact<T, TQuery>,
		Reporter,
		ResourceBuilderKind
	>({
		key: 'resource.registry.record',
		kind: RESOURCE_BUILDER_KIND,
		dependsOn: ['resource.object.build'],
		apply: ({ context, output }) => {
			const resource = output.resource;
			if (!resource) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource registry recording requires a built resource. Ensure resource.object.build runs first.',
				});
			}

			const { namespace, resourceName, storeKey } =
				assertResourceMetadata(output, context);

			const sideEffects = ensureSideEffects(output);
			const registryCallback = context.registry?.recordResourceDefined;
			const broadcastReporter = context.reporter.child('broadcast');
			const broadcastState = { current: false };
			const storeState = { current: false };
			let recorded = false;

			const event: ResourceDefinedEvent = {
				namespace,
				resource: resource as ResourceObject<unknown, unknown>,
			};

			sideEffects.commits.push(() => {
				registerStoreKey(storeKey);
				storeState.current = true;

				registryCallback?.(event);
				recordResourceDefined(event);
				recorded = true;
				getWPKernelEventBus().emit('resource:defined', event);

				postResourceBroadcast({
					payload: {
						namespace,
						resourceName,
						storeKey,
						status: 'committed',
					},
					reporter: broadcastReporter,
				});
				broadcastState.current = true;
			});

			sideEffects.rollbacks.push(() => {
				if (storeState.current) {
					unregisterStoreKey(storeKey);
					storeState.current = false;
				}

				if (recorded) {
					removeRecordedResource(event);
					recorded = false;
				}

				if (!broadcastState.current) {
					return;
				}

				postResourceBroadcast({
					payload: {
						namespace,
						resourceName,
						storeKey,
						status: 'rolled-back',
					},
					reporter: broadcastReporter,
				});
				broadcastState.current = false;
			});
		},
	}) satisfies ResourceBuilderHelper<T, TQuery>;
}
