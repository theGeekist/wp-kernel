import { createPipeline } from '../createPipeline';
import { KernelError } from '@wpkernel/core/error';
import type { BuilderHelper, FragmentHelper } from '../types';
import {
	buildBuilderHelper,
	buildFragmentHelper,
} from '@wpkernel/test-utils/next/runtime/pipeline.fixtures.test-support';

describe('createPipeline registration', () => {
	it('throws when registering a fragment with wrong kind', () => {
		const pipeline = createPipeline();

		const builder = buildBuilderHelper({
			key: 'builder.wrong-surface',
			apply: async () => undefined,
		});

		expect(() =>
			pipeline.ir.use(builder as unknown as FragmentHelper)
		).toThrow(KernelError);
	});

	it('throws when registering a builder with wrong kind', () => {
		const pipeline = createPipeline();

		const fragment = buildFragmentHelper({
			key: 'ir.wrong-surface',
			apply: async () => undefined,
		});

		expect(() =>
			pipeline.builders.use(fragment as unknown as BuilderHelper)
		).toThrow(KernelError);
	});

	it('throws on multiple overrides for same fragment key', () => {
		const pipeline = createPipeline();

		const first = buildFragmentHelper({
			key: 'same',
			mode: 'override',
			apply: async () => undefined,
			origin: 'a',
		});
		const duplicate = buildFragmentHelper({
			key: 'same',
			mode: 'override',
			apply: async () => undefined,
			origin: 'b',
		});

		pipeline.use(first);

		expect(() => pipeline.use(duplicate)).toThrow(KernelError);
	});
});
