import { buildResourceReporterFragment } from '../buildResourceReporterFragment';
import type {
	ResourcePipelineContext,
	ResourcePipelineDraft,
} from '../../types';
import { createNoopReporter } from '../../../../reporter';
import type { Reporter } from '../../../../reporter/types';
import type { NormalizedResourceConfig } from '../../../../resource/buildResourceObject';

describe('buildResourceReporterFragment', () => {
	const customReporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => customReporter),
	};

	function buildContext(): ResourcePipelineContext<unknown, unknown> {
		const config = {
			name: 'acme/widget',
			routes: {},
			reporter: customReporter,
		} as const;

		const normalizedConfig: NormalizedResourceConfig<unknown, unknown> = {
			...config,
			name: 'widget',
		};

		return {
			config,
			normalizedConfig,
			namespace: 'acme',
			resourceName: 'widget',
			reporter: createNoopReporter(),
			storeKey: 'acme/widget',
			registry: undefined,
		} satisfies ResourcePipelineContext<unknown, unknown>;
	}

	it('uses the resolved reporter and exposes it through the draft', () => {
		const helper = buildResourceReporterFragment<unknown, unknown>();
		const context = buildContext();
		const output: ResourcePipelineDraft<unknown, unknown> = {};

		helper.apply({
			context,
			input: context.config,
			output,
			reporter: context.reporter,
		});

		expect(context.reporter).toBe(customReporter);
		expect(output.reporter).toBe(customReporter);
	});
});
