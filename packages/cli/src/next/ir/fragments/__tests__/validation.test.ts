import { createValidationFragment } from '../validation';
import { KernelError } from '@wpkernel/core/error';

// This test file uses minimal, valid shapes from the IR types to exercise
// the validation fragment's branches (missing meta, missing policyMap,
// resource missing schemaKey, and successful case).

describe('createValidationFragment', () => {
	const fragment = createValidationFragment();

	const mockMeta = {
		version: 1 as const,
		namespace: 'test',
		sourcePath: '/src',
		origin: 'test',
		sanitizedNamespace: 'test',
	};

	const mockPolicyMap = {
		definitions: [],
		fallback: { capability: 'read', appliesTo: 'resource' },
		missing: [],
		unused: [],
		warnings: [],
	};

	const mockResource = {
		name: 'TestResource',
		schemaKey: 'schema',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
		},
		hash: '',
		warnings: [],
	};

	const mockConfig = {
		version: 1 as const,
		namespace: 'test',
		schemas: {},
		resources: {},
	};

	function makeApplyOptions(draft: any) {
		const output = {
			draft,
			assign() {},
		};

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

	it('throws when meta is not present', async () => {
		const draft = { policyMap: mockPolicyMap, resources: [mockResource] };
		await expect(fragment.apply(makeApplyOptions(draft))).rejects.toThrow(
			KernelError
		);
	});

	it('throws when policyMap is not present', async () => {
		const draft = { meta: mockMeta, resources: [mockResource] };
		await expect(fragment.apply(makeApplyOptions(draft))).rejects.toThrow(
			KernelError
		);
	});

	it('throws when a resource is missing schemaKey', async () => {
		const badResource = { ...mockResource } as any;
		delete badResource.schemaKey;
		const draft = {
			meta: mockMeta,
			policyMap: mockPolicyMap,
			resources: [badResource],
		};
		await expect(fragment.apply(makeApplyOptions(draft))).rejects.toThrow(
			KernelError
		);
	});

	it('resolves when meta, policyMap and resources are present', async () => {
		const draft = {
			meta: mockMeta,
			policyMap: mockPolicyMap,
			resources: [mockResource],
		};
		await expect(
			fragment.apply(makeApplyOptions(draft))
		).resolves.toBeUndefined();
	});
});
