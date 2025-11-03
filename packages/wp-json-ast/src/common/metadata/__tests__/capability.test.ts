import { buildCapabilityHelperMetadata } from '../capability';

describe('buildCapabilityHelperMetadata', () => {
	it('creates capability helper metadata with cloned structures', () => {
		const warningContext = {
			capability: 'demo.update',
			details: { scope: 'object' },
		} as const;

		const metadata = buildCapabilityHelperMetadata({
			sourcePath: 'src/capability-map.ts',
			fallback: { capability: 'manage_demo', appliesTo: 'resource' },
			definitions: [
				{
					key: 'demo.create',
					capability: 'create_demo',
					appliesTo: 'resource',
					source: 'map',
				},
				{
					key: 'demo.update',
					capability: 'edit_demo',
					appliesTo: 'object',
					binding: 'id',
					source: 'map',
				},
			],
			missing: ['demo.delete'],
			unused: ['demo.view'],
			warnings: [
				{
					code: 'capability-map.binding.missing',
					message: 'Binding could not be inferred.',
					context: warningContext,
				},
			],
		});

		expect(metadata).toEqual({
			kind: 'capability-helper',
			map: {
				sourcePath: 'src/capability-map.ts',
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				definitions: [
					{
						key: 'demo.create',
						capability: 'create_demo',
						appliesTo: 'resource',
						binding: undefined,
						source: 'map',
					},
					{
						key: 'demo.update',
						capability: 'edit_demo',
						appliesTo: 'object',
						binding: 'id',
						source: 'map',
					},
				],
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'capability-map.binding.missing',
						message: 'Binding could not be inferred.',
						context: {
							details: { scope: 'object' },
							capability: 'demo.update',
						},
					},
				],
			},
		});

		const [warning] = metadata.map.warnings;
		expect(warning?.context).not.toBeUndefined();

		if (!warning?.context || typeof warning.context !== 'object') {
			throw new Error('Expected warning context to be an object.');
		}

		(warningContext as any).details.scope = 'mutated';

		expect(warning.context).toEqual({
			details: { scope: 'object' },
			capability: 'demo.update',
		});
	});
});
