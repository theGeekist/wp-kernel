import { buildResourceRegistryRecorder } from '../buildResourceRegistryRecorder';
import { createResourcePipeline } from '../../createResourcePipeline';
import { createNoopReporter } from '../../../../reporter';
import type {
	ResourcePipelineContext,
	ResourcePipelineArtifact,
} from '../../types';
import type {
	ResourceConfig,
	ResourceObject,
} from '../../../../resource/types';
import * as cacheModule from '../../../../resource/cache';
import * as eventsModule from '../../../../events/bus';

class MockBroadcastChannel {
	public static instances: MockBroadcastChannel[] = [];

	public messages: unknown[] = [];

	public name: string;

	constructor(name: string) {
		this.name = name;
		MockBroadcastChannel.instances.push(this);
	}

	postMessage(message: unknown): void {
		this.messages.push(message);
	}

	close(): void {}
}

describe('buildResourceRegistryRecorder', () => {
	const originalBroadcast = globalThis.BroadcastChannel;
	const originalWindowBroadcast =
		typeof window === 'undefined' ? undefined : window.BroadcastChannel;

	beforeEach(() => {
		MockBroadcastChannel.instances = [];
		(
			globalThis as { BroadcastChannel?: typeof BroadcastChannel }
		).BroadcastChannel =
			MockBroadcastChannel as unknown as typeof BroadcastChannel;
		if (typeof window !== 'undefined') {
			window.BroadcastChannel =
				MockBroadcastChannel as unknown as typeof BroadcastChannel;
		}
	});

	afterEach(() => {
		jest.restoreAllMocks();
		eventsModule.clearRegisteredResources();
		if (typeof window !== 'undefined') {
			if (originalWindowBroadcast) {
				window.BroadcastChannel = originalWindowBroadcast;
			} else {
				Reflect.deleteProperty(window, 'BroadcastChannel');
			}
		}
		if (originalBroadcast) {
			globalThis.BroadcastChannel = originalBroadcast;
		} else {
			Reflect.deleteProperty(globalThis, 'BroadcastChannel');
		}
	});

	function buildContext(): ResourcePipelineContext<unknown, unknown> {
		const reporter = createNoopReporter();
		const config: ResourceConfig<unknown, unknown> = {
			name: 'Example',
			routes: {},
		};

		return {
			config,
			reporter,
			namespace: 'acme/resources',
			resourceName: 'Example',
			storeKey: 'acme/resources/Example',
		};
	}

	function buildDraft(
		context: ResourcePipelineContext<unknown, unknown>
	): ResourcePipelineArtifact<unknown, unknown> {
		return {
			namespace: context.namespace,
			resourceName: context.resourceName,
			storeKey: context.storeKey,
			resource: { name: 'Example' } as ResourceObject<unknown, unknown>,
		};
	}

	it('registers side effects for store registration, registry recording, and broadcast', () => {
		const helper = buildResourceRegistryRecorder<unknown, unknown>();
		const context = buildContext();
		const draft = buildDraft(context);

		const registerSpy = jest.spyOn(cacheModule, 'registerStoreKey');
		const recordSpy = jest.spyOn(eventsModule, 'recordResourceDefined');
		const emitSpy = jest.spyOn(eventsModule.getWPKernelEventBus(), 'emit');

		helper.apply({
			context,
			input: context.config,
			output: draft,
			reporter: context.reporter,
		});

		const commitTasks = draft.sideEffects?.commits ?? [];
		expect(commitTasks).not.toHaveLength(0);

		commitTasks.forEach((task) => task());

		expect(registerSpy).toHaveBeenCalledWith('acme/resources/Example');
		expect(recordSpy).toHaveBeenCalledWith(
			expect.objectContaining({ namespace: 'acme/resources' })
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'resource:defined',
			expect.objectContaining({ namespace: 'acme/resources' })
		);

		const channel = MockBroadcastChannel.instances.at(-1);
		expect(channel).toBeDefined();
		expect(channel?.name).toBe('wpk.resources');
		expect(channel?.messages).toContainEqual({
			type: 'wpk.resource.defined',
			payload: expect.objectContaining({
				namespace: 'acme/resources',
				resourceName: 'Example',
				storeKey: 'acme/resources/Example',
				status: 'committed',
			}),
		});
	});

	it('rolls back store registration and emits rollback broadcast when triggered', () => {
		const helper = buildResourceRegistryRecorder<unknown, unknown>();
		const context = buildContext();
		const draft = buildDraft(context);

		const unregisterSpy = jest.spyOn(cacheModule, 'unregisterStoreKey');
		const removeSpy = jest.spyOn(eventsModule, 'removeRecordedResource');

		helper.apply({
			context,
			input: context.config,
			output: draft,
			reporter: context.reporter,
		});

		draft.sideEffects?.commits.forEach((task) => task());
		draft.sideEffects?.rollbacks.forEach((task) => task());

		expect(unregisterSpy).toHaveBeenCalledWith('acme/resources/Example');
		expect(removeSpy).toHaveBeenCalledTimes(1);

		const channel = MockBroadcastChannel.instances.at(-1);
		const rollbackMessage = channel?.messages.at(-1);
		expect(rollbackMessage).toEqual({
			type: 'wpk.resource.defined',
			payload: expect.objectContaining({ status: 'rolled-back' }),
		});
	});

	it('skips rollback side effects when commit never executed', () => {
		const helper = buildResourceRegistryRecorder<unknown, unknown>();
		const context = buildContext();
		const draft = buildDraft(context);

		const unregisterSpy = jest.spyOn(cacheModule, 'unregisterStoreKey');
		const removeSpy = jest.spyOn(eventsModule, 'removeRecordedResource');

		helper.apply({
			context,
			input: context.config,
			output: draft,
			reporter: context.reporter,
		});

		draft.sideEffects?.rollbacks.forEach((task) => task());

		expect(unregisterSpy).not.toHaveBeenCalled();
		expect(removeSpy).not.toHaveBeenCalled();
		expect(MockBroadcastChannel.instances).toHaveLength(0);
	});

	it('executes commit side effects when the resource pipeline runs', () => {
		const pipeline = createResourcePipeline<unknown, unknown>();
		const registerSpy = jest.spyOn(cacheModule, 'registerStoreKey');
		const recordSpy = jest.spyOn(eventsModule, 'recordResourceDefined');

		pipeline.run({
			config: {
				name: 'pipeline-side-effect',
				routes: {
					list: { path: '/test/v1/items', method: 'GET' as const },
				},
			},
		});

		expect(registerSpy).toHaveBeenCalled();
		expect(recordSpy).toHaveBeenCalled();
	});
});
