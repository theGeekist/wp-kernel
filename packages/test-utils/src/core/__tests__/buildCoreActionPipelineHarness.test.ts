import type { Reporter } from '@wpkernel/core/reporter/types';
import type { ActionPipelineRunOptions } from '@wpkernel/core/pipeline/actions/types';
import { buildCoreActionPipelineHarness } from '../buildCoreActionPipelineHarness.test-support';

describe('buildCoreActionPipelineHarness', () => {
	afterEach(() => {
		delete (
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: { reporter?: Reporter };
			}
		).__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('provides a pipeline that executes handlers through the harness reporter', async () => {
		const harness = buildCoreActionPipelineHarness<
			{ value: string },
			string
		>();

		const runOptions: ActionPipelineRunOptions<{ value: string }, string> =
			{
				config: {
					name: 'Tests.Action',
					handler: async () => 'ok',
				},
				args: { value: 'demo' },
				definition: {
					action: (async () => undefined) as never,
					namespace: harness.namespace,
				},
			};

		const result = await harness.pipeline.run(runOptions);
		expect(result.artifact.result).toBe('ok');
		harness.teardown();
	});

	it('installs and restores the runtime reporter around the pipeline lifecycle', () => {
		const harness = buildCoreActionPipelineHarness();
		const runtime = (
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: { reporter?: Reporter };
			}
		).__WP_KERNEL_ACTION_RUNTIME__;

		expect(runtime?.reporter).toBe(harness.reporter.reporter as Reporter);
		harness.teardown();
		expect(
			(
				globalThis as {
					__WP_KERNEL_ACTION_RUNTIME__?: unknown;
				}
			).__WP_KERNEL_ACTION_RUNTIME__
		).toBeUndefined();
	});
});
