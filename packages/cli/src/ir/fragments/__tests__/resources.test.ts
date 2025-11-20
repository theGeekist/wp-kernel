import { createResourcesFragment } from '../resources';
import { WPKernelError } from '@wpkernel/core/error';
jest.mock('../../shared/resource-builder', () => {
	const { createResourceBuilderMock } = jest.requireActual(
		'@cli-tests/ir/resource-builder.mock'
	);
	return createResourceBuilderMock();
});

import { buildResources } from '../../shared/resource-builder';

describe('createResourcesFragment', () => {
	const fragment = createResourcesFragment();

	const mockConfig = {
		version: 1 as const,
		namespace: 'test',
		schemas: {},
		resources: {},
	};

	function makeApplyOptions(draft: any) {
		const output = {
			draft,
			assign(partial: any) {
				Object.assign(draft, partial);
			},
		} as any;
		return {
			context: {} as any,
			input: {
				options: {
					config: mockConfig,
					sourcePath: '',
					origin: '',
					namespace: '',
				},
				draft,
			} as any,
			output,
			reporter: {} as any,
		} as any;
	}

	it('throws if meta extension missing', async () => {
		const draft = { extensions: {} } as any;
		await expect(fragment.apply(makeApplyOptions(draft))).rejects.toThrow(
			WPKernelError
		);
	});

	it('throws if schema accumulator missing', async () => {
		const draft = {
			extensions: { 'ir.meta.core': { sanitizedNamespace: 'ns' } },
		} as any;
		await expect(fragment.apply(makeApplyOptions(draft))).rejects.toThrow(
			WPKernelError
		);
	});

	it('calls buildResources and assigns resources on success', async () => {
		const accumulator = {
			/* minimal accumulator */
		};
		const draft = {
			extensions: {
				'ir.meta.core': { sanitizedNamespace: 'ns' },
				'ir.schemas.core': accumulator,
			},
		} as any;

		await fragment.apply(makeApplyOptions(draft));

		expect(buildResources).toHaveBeenCalledWith(
			expect.any(Object),
			accumulator,
			'ns'
		);
		expect(draft.resources).toBeDefined();
		expect(Array.isArray(draft.resources)).toBe(true);
		expect(draft.resources[0].name).toBe('Thing');
	});
});
