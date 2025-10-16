import { createPipeline } from '../createPipeline';
import { KernelError } from '@wpkernel/core/error';

describe('createPipeline registration', () => {
	it('throws when registering a fragment with wrong kind', () => {
		const pipeline = createPipeline();

		expect(() =>
			// @ts-expect-error test wrong kind
			pipeline.ir.use({
				kind: 'builder',
				key: 'x',
				mode: 'normal',
				priority: 0,
				dependsOn: [],
				origin: 't',
			})
		).toThrow(KernelError);
	});

	it('throws when registering a builder with wrong kind', () => {
		const pipeline = createPipeline();

		expect(() =>
			// @ts-expect-error test wrong kind
			pipeline.builders.use({
				kind: 'fragment',
				key: 'b',
				mode: 'normal',
				priority: 0,
				dependsOn: [],
				origin: 't',
			})
		).toThrow(KernelError);
	});

	it('throws on multiple overrides for same fragment key', () => {
		const pipeline = createPipeline();

		const frag = {
			kind: 'fragment',
			key: 'same',
			mode: 'override',
			priority: 0,
			dependsOn: [],
			apply: async () => {},
			origin: 'a',
		} as any;
		pipeline.use(frag);
		expect(() => pipeline.use({ ...frag, origin: 'b' })).toThrow(
			KernelError
		);
	});
});
