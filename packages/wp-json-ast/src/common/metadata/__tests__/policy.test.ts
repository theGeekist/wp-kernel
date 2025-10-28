import { buildPolicyHelperMetadata } from '../policy';

describe('buildPolicyHelperMetadata', () => {
	it('creates policy helper metadata with cloned structures', () => {
		const warningContext = {
			policy: 'demo.update',
			details: { scope: 'object' },
		} as const;

		const metadata = buildPolicyHelperMetadata({
			sourcePath: 'src/policy-map.ts',
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
					code: 'policy-map.binding.missing',
					message: 'Binding could not be inferred.',
					context: warningContext,
				},
			],
		});

		expect(metadata).toEqual({
			kind: 'policy-helper',
			map: {
				sourcePath: 'src/policy-map.ts',
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
						code: 'policy-map.binding.missing',
						message: 'Binding could not be inferred.',
						context: {
							details: { scope: 'object' },
							policy: 'demo.update',
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
			policy: 'demo.update',
		});
	});
});
