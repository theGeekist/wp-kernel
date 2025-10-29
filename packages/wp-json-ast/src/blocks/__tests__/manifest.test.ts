import { buildManifestMetadata } from '../manifest';

describe('buildManifestMetadata', () => {
	it('sanitises entries and sorts block keys', () => {
		const result = buildManifestMetadata({
			'demo/example': {
				directory: ' src/blocks/example ',
				manifest: ' src/blocks/example/block.json ',
				render: ' src/blocks/example/render.php ',
			},
			'alpha/first': {
				directory: 'src/blocks/first',
				manifest: 'src/blocks/first/block.json',
			},
		});

		expect(result.manifest).toEqual({
			'alpha/first': {
				directory: 'src/blocks/first',
				manifest: 'src/blocks/first/block.json',
			},
			'demo/example': {
				directory: 'src/blocks/example',
				manifest: 'src/blocks/example/block.json',
				render: 'src/blocks/example/render.php',
			},
		});
		expect(result.errors).toHaveLength(0);
	});

	it('returns validation errors for invalid manifest entries', () => {
		const result = buildManifestMetadata({
			'demo/broken': {
				directory: ' ',
				manifest: 'src/blocks/broken/block.json',
			},
			'demo/invalid-render': {
				directory: 'src/blocks/render',
				manifest: 'src/blocks/render/block.json',
				render: 42 as unknown as string,
			},
			'demo/missing-manifest': {
				directory: 'src/blocks/missing',
				manifest: '',
			},
		});

		expect(result.manifest).toEqual({
			'demo/invalid-render': {
				directory: 'src/blocks/render',
				manifest: 'src/blocks/render/block.json',
			},
		});

		expect(result.errors).toEqual([
			{
				code: 'block-manifest/missing-directory',
				block: 'demo/broken',
				field: 'directory',
				message:
					'Block "demo/broken": manifest entry is missing a directory path.',
				value: ' ',
			},
			{
				code: 'block-manifest/invalid-render',
				block: 'demo/invalid-render',
				field: 'render',
				message:
					'Block "demo/invalid-render": render path must be a non-empty string when provided.',
				value: 42,
			},
			{
				code: 'block-manifest/missing-manifest',
				block: 'demo/missing-manifest',
				field: 'manifest',
				message:
					'Block "demo/missing-manifest": manifest entry is missing a manifest file path.',
				value: '',
			},
		]);
	});
});
