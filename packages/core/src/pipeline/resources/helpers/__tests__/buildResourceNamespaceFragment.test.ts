import { buildResourceNamespaceFragment } from '../buildResourceNamespaceFragment';
import type {
	ResourcePipelineContext,
	ResourcePipelineDraft,
} from '../../types';
import type { Reporter } from '../../../../reporter/types';
import { createNoopReporter } from '../../../../reporter';

function buildContext(): ResourcePipelineContext<unknown, unknown> {
	const config = {
		name: 'acme:widget',
		routes: {},
	} as const;

	return {
		config,
		normalizedConfig: undefined,
		namespace: '',
		resourceName: '',
		reporter: createNoopReporter(),
		storeKey: '',
		registry: undefined,
	} satisfies ResourcePipelineContext<unknown, unknown>;
}

function buildDraft(): ResourcePipelineDraft<unknown, unknown> {
	return {};
}

describe('buildResourceNamespaceFragment', () => {
	it('normalizes namespace and resource name', () => {
		const helper = buildResourceNamespaceFragment<unknown, unknown>();
		const context = buildContext();
		const output = buildDraft();

		helper.apply({
			context,
			input: context.config,
			output,
			reporter: context.reporter as Reporter,
		});

		expect(context.namespace).toBe('acme');
		expect(context.resourceName).toBe('widget');
		expect(context.storeKey).toBe('acme/widget');
		expect(context.normalizedConfig).toBeDefined();
		expect(context.normalizedConfig?.name).toBe('widget');
		expect(output.namespace).toBe('acme');
		expect(output.resourceName).toBe('widget');
		expect(output.storeKey).toBe('acme/widget');
	});
});
