import { buildBlockModule } from '../module';
import type { BlockModuleConfig } from '../types';
import type { PhpNode } from '@wpkernel/php-json-ast';

function hasMatchingNameNode(
	value: unknown,
	matcher: (node: PhpNode & { readonly parts?: unknown }) => boolean
): boolean {
	if (Array.isArray(value)) {
		return value.some((entry) => hasMatchingNameNode(entry, matcher));
	}

	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<PhpNode> & { readonly parts?: unknown };
	if (
		typeof candidate.nodeType === 'string' &&
		candidate.nodeType.length > 0 &&
		matcher(candidate as PhpNode & { readonly parts?: unknown })
	) {
		return true;
	}

	return Object.values(candidate).some((entry) =>
		hasMatchingNameNode(entry, matcher)
	);
}

describe('buildBlockModule', () => {
	it('emits manifest and registrar files plus render stubs', () => {
		const config: BlockModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Blocks',
			manifest: {
				fileName: 'build/blocks-manifest.php',
				entries: {
					'demo/example': {
						directory: 'src/blocks/example',
						manifest: 'src/blocks/example/block.json',
						render: 'src/blocks/example/render.php',
					},
				},
			},
			registrarFileName: 'Blocks/Register.php',
			renderStubs: [
				{
					blockKey: 'demo/example',
					manifest: {
						title: 'Example Block',
					},
					target: {
						absolutePath:
							'/workspace/src/blocks/example/render.php',
						relativePath: 'src/blocks/example/render.php',
					},
				},
			],
		};

		const result = buildBlockModule(config);
		expect(result.files).toHaveLength(2);

		const manifestFile = result.files.find(
			(file) => file.metadata.kind === 'block-manifest'
		);
		expect(manifestFile).toBeDefined();
		expect(manifestFile?.program).toHaveLength(4);
		expect(manifestFile?.docblock).toEqual([
			'Source: wpk.config.ts → blocks.ssr.manifest',
		]);

		const registrarFile = result.files.find(
			(file) => file.metadata.kind === 'block-registrar'
		);
		expect(registrarFile).toBeDefined();
		expect(registrarFile?.docblock).toEqual([
			'Source: wpk.config.ts → blocks.ssr.register',
		]);
		expect(registrarFile?.program).toHaveLength(2);
		expect(
			hasMatchingNameNode(registrarFile?.program, (node) => {
				if (
					node.nodeType !== 'Name_FullyQualified' ||
					!Array.isArray((node as { parts?: unknown }).parts)
				) {
					return false;
				}

				const parts = (node as { parts: string[] }).parts;
				return parts.length === 1 && parts[0] === 'WP_Block';
			})
		).toBe(true);

		expect(result.renderStubs).toHaveLength(1);
		const stub = result.renderStubs[0]!;
		expect(stub.relativePath).toBe('src/blocks/example/render.php');
		expect(stub.contents).toContain('AUTO-GENERATED WPK STUB');
	});

	it('omits manifest file when no entries are present', () => {
		const config: BlockModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Blocks',
			manifest: {
				entries: {},
			},
		};

		const result = buildBlockModule(config);
		expect(result.files).toHaveLength(1);
		expect(result.files[0]?.metadata.kind).toBe('block-registrar');
	});

	it('applies augmentation hooks before returning files and stubs', () => {
		const config: BlockModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Blocks',
			manifest: {
				entries: {
					'demo/example': {
						directory: 'src/blocks/example',
						manifest: 'src/blocks/example/block.json',
						render: 'src/blocks/example/render.php',
					},
				},
			},
			hooks: {
				manifestFile: (file) => ({
					...file,
					docblock: [...file.docblock, 'Hooked'],
				}),
				registrarFile: (file) => ({
					...file,
					fileName: 'Blocks/HookedRegister.php',
				}),
				renderStub: (stub) => ({
					...stub,
					contents: `${stub.contents}\n<!-- Hooked -->\n`,
				}),
			},
			renderStubs: [
				{
					blockKey: 'demo/example',
					manifest: { title: 'Example Block' },
					target: {
						absolutePath:
							'/workspace/src/blocks/example/render.php',
						relativePath: 'src/blocks/example/render.php',
					},
				},
			],
		} satisfies BlockModuleConfig;

		const result = buildBlockModule(config);
		const manifestFile = result.files.find(
			(file) => file.metadata.kind === 'block-manifest'
		);
		const registrarFile = result.files.find(
			(file) => file.metadata.kind === 'block-registrar'
		);

		expect(manifestFile?.docblock).toContain('Hooked');
		expect(registrarFile?.fileName).toBe('Blocks/HookedRegister.php');
		expect(result.renderStubs[0]?.contents).toContain('<!-- Hooked -->');
	});

	it('surfaces manifest validation errors via metadata', () => {
		const config: BlockModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Blocks',
			manifest: {
				entries: {
					'demo/invalid': {
						directory: '',
						manifest: 'src/blocks/invalid/block.json',
					},
				},
			},
		} satisfies BlockModuleConfig;

		const result = buildBlockModule(config);
		const manifestFile = result.files.find(
			(file) => file.metadata.kind === 'block-manifest'
		);

		expect(manifestFile).toBeDefined();
		if (!manifestFile || manifestFile.metadata.kind !== 'block-manifest') {
			throw new Error('manifest file metadata missing');
		}

		expect(manifestFile.metadata.validation?.errors).toEqual([
			expect.objectContaining({
				code: 'block-manifest/missing-directory',
				block: 'demo/invalid',
			}),
		]);
	});
});
