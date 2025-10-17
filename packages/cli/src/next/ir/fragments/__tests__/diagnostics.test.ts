import { createReporterMock } from '@wpkernel/test-utils/cli';
import type { KernelConfigV1 } from '../../../../config/types';
import { createDiagnosticsFragment } from '../diagnostics';
import { createIrDraft, createIrFragmentOutput } from '../../types';

function createDraft(): ReturnType<typeof createIrDraft> {
	const config = {
		version: 1,
		namespace: 'test',
		schemas: {},
		resources: {},
	} as KernelConfigV1;

	return createIrDraft({
		config,
		namespace: config.namespace,
		origin: 'typescript',
		sourcePath: '/tmp/kernel.config.ts',
	});
}

describe('createDiagnosticsFragment', () => {
	it('collects resource and policy diagnostics when warnings are present', async () => {
		const fragment = createDiagnosticsFragment();
		const draft = createDraft();
		draft.resources = [
			{
				name: 'remote',
				warnings: [
					{
						code: 'route.remote.namespace',
						message:
							'Remote resources require explicit namespaces.',
					},
				],
			},
		] as unknown as typeof draft.resources;
		draft.policyMap = {
			sourcePath: undefined,
			definitions: [],
			fallback: { capability: 'manage_options', appliesTo: 'resource' },
			missing: [],
			unused: [],
			warnings: [
				{
					code: 'policy-map.missing-policy',
					message: 'Missing policy mapping.',
				},
			],
		};

		const reporter = createReporterMock();
		const output = createIrFragmentOutput(draft);

		await fragment.apply(
			{
				context: {
					workspace: { root: '/tmp/workspace' } as never,
					phase: 'generate',
					reporter,
				},
				input: {
					options: {
						config: draft.config,
						namespace: draft.config.namespace,
						origin: 'typescript',
						sourcePath: '/tmp/kernel.config.ts',
					},
					draft,
				},
				output,
				reporter,
			},
			async () => {}
		);

		expect(draft.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.stringContaining('resource:remote'),
					severity: 'warn',
				}),
				expect.objectContaining({
					key: expect.stringContaining(
						'policy-map:policy-map.missing-policy'
					),
					severity: 'warn',
				}),
			])
		);
	});

	it('omits diagnostics when neither resources nor policy map provide warnings', async () => {
		const fragment = createDiagnosticsFragment();
		const draft = createDraft();
		draft.resources = [
			{
				name: 'local',
				warnings: [],
			},
		] as unknown as typeof draft.resources;

		const reporter = createReporterMock();
		const output = createIrFragmentOutput(draft);

		await fragment.apply(
			{
				context: {
					workspace: { root: '/tmp/workspace' } as never,
					phase: 'generate',
					reporter,
				},
				input: {
					options: {
						config: draft.config,
						namespace: draft.config.namespace,
						origin: 'typescript',
						sourcePath: '/tmp/kernel.config.ts',
					},
					draft,
				},
				output,
				reporter,
			},
			async () => {}
		);

		expect(draft.diagnostics).toEqual([]);
	});
});
