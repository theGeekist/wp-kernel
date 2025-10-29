import { buildResourceGroupedApiBuilder } from '../buildResourceGroupedApiBuilder';
import type {
	ResourcePipelineArtifact,
	ResourcePipelineContext,
} from '../../types';
import { createNoopReporter } from '../../../../reporter';
import type { NormalizedResourceConfig } from '../../../../resource/buildResourceObject';
import type { Reporter } from '../../../../reporter/types';
import type { ResourceObject } from '../../../../resource/types';
import { WPKernelError } from '../../../../error/WPKernelError';

function buildContext(): ResourcePipelineContext<unknown, unknown> {
	const config = {
		name: 'widget',
		namespace: 'acme',
		routes: {
			list: { path: '/acme/v1/widgets', method: 'GET' },
			get: { path: '/acme/v1/widgets/:id', method: 'GET' },
		},
	} as const;

	const normalizedConfig: NormalizedResourceConfig<unknown, unknown> = {
		...config,
		name: config.name,
	};

	return {
		config,
		normalizedConfig,
		namespace: config.namespace,
		resourceName: config.name,
		reporter: createNoopReporter(),
		storeKey: `${config.namespace}/${config.name}`,
		registry: undefined,
	} satisfies ResourcePipelineContext<unknown, unknown>;
}

describe('buildResourceGroupedApiBuilder', () => {
	it('throws when cache keys are missing', () => {
		const helper = buildResourceGroupedApiBuilder<unknown, unknown>();
		const context = buildContext();
		const artifact: ResourcePipelineArtifact<unknown, unknown> = {};

		expect(() =>
			helper.apply({
				context,
				input: context.config,
				output: artifact,
				reporter: context.reporter as Reporter,
			})
		).toThrow(WPKernelError);
	});

	it('generates grouped API getter factories', () => {
		const helper = buildResourceGroupedApiBuilder<unknown, unknown>();
		const context = buildContext();
		const artifact: ResourcePipelineArtifact<unknown, unknown> = {
			cacheKeys: {
				list: () => ['list'],
				get: () => ['get'],
				create: () => ['create'],
				update: () => ['update'],
				remove: () => ['remove'],
			},
		};

		helper.apply({
			context,
			input: context.config,
			output: artifact,
			reporter: context.reporter as Reporter,
		});

		expect(artifact.groupedApi).toBeDefined();
		expect(typeof artifact.groupedApi?.cache).toBe('function');
		expect(typeof artifact.groupedApi?.storeApi).toBe('function');
		expect(typeof artifact.groupedApi?.events).toBe('function');

		const events = artifact.groupedApi?.events.call({
			storeKey: context.storeKey,
			reporter: context.reporter,
			cacheKeys: artifact.cacheKeys!,
			name: context.resourceName,
			routes: context.config.routes,
			invalidate: jest.fn(),
			key: jest.fn(() => []),
		} as unknown as ResourceObject<unknown, unknown>);

		expect(events).toEqual({
			created: 'acme.widget.created',
			updated: 'acme.widget.updated',
			removed: 'acme.widget.removed',
		});
	});
});
