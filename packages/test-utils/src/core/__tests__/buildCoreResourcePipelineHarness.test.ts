import type { ResourcePipelineRunOptions } from '@wpkernel/core/pipeline/resources/types';
import { buildCoreResourcePipelineHarness } from '../buildCoreResourcePipelineHarness.test-support';

describe('buildCoreResourcePipelineHarness', () => {
	it('creates a pipeline and reporter for resource orchestration', async () => {
		const harness = buildCoreResourcePipelineHarness<
			{ id: number },
			{ search?: string }
		>({ resourceName: 'example-resource' });

		const config = {
			name: 'example-resource',
			routes: {
				list: { path: '/example/v1/resources', method: 'GET' as const },
			},
		};

		const runOptions: ResourcePipelineRunOptions<
			{ id: number },
			{ search?: string }
		> = {
			config,
		};

		const result = await harness.pipeline.run(runOptions);
		expect(result.artifact.resource?.name).toBe('example-resource');
	});
});
