import { createReporterMock as buildReporterMock } from '@wpkernel/test-utils/cli';
import type { WPKernelConfigV1 } from '../../../config/types';
import { createDiagnosticsFragment } from '../diagnostics';
import { buildIrDraft, buildIrFragmentOutput } from '../../types';

function buildDraft(): ReturnType<typeof buildIrDraft> {
	const config = {
		version: 1,
		namespace: 'test',
		schemas: {},
		resources: {},
	} as WPKernelConfigV1;

	return buildIrDraft({
		config,
		namespace: config.namespace,
		origin: 'typescript',
		sourcePath: '/tmp/wpk.config.ts',
	});
}

describe('createDiagnosticsFragment', () => {
	it('collects resource and capability diagnostics when warnings are present', async () => {
		const fragment = createDiagnosticsFragment();
		const draft = buildDraft();
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
		draft.capabilityMap = {
			sourcePath: undefined,
			definitions: [],
			fallback: { capability: 'manage_options', appliesTo: 'resource' },
			missing: [],
			unused: [],
			warnings: [
				{
					code: 'capability-map.missing-capability',
					message: 'Missing capability mapping.',
				},
			],
		};

		const reporter = buildReporterMock();
		const output = buildIrFragmentOutput(draft);

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
						sourcePath: '/tmp/wpk.config.ts',
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
						'capability-map:capability-map.missing-capability'
					),
					severity: 'warn',
				}),
			])
		);
	});

	it('omits diagnostics when neither resources nor capability map provide warnings', async () => {
		const fragment = createDiagnosticsFragment();
		const draft = buildDraft();
		draft.resources = [
			{
				name: 'local',
				warnings: [],
			},
		] as unknown as typeof draft.resources;

		const reporter = buildReporterMock();
		const output = buildIrFragmentOutput(draft);

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
						sourcePath: '/tmp/wpk.config.ts',
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
