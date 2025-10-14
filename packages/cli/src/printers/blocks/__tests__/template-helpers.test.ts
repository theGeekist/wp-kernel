import path from 'node:path';
import {
	formatBlockVariableName,
	generateBlockImportPath,
	validateBlockManifest,
} from '../shared/template-helpers';

describe('template helpers', () => {
	it('creates relative import paths with posix separators', () => {
		const outputPath = path.join(
			'/workspace',
			'blocks',
			'auto-register.ts'
		);
		const manifestPath = path.join(
			'/workspace',
			'blocks',
			'example',
			'block.json'
		);

		const importPath = generateBlockImportPath(manifestPath, outputPath);

		expect(importPath).toBe('./example/block.json');
	});

	it('generates stable variable names', () => {
		expect(formatBlockVariableName('demo/example-block')).toBe(
			'demoExampleBlock'
		);
		expect(formatBlockVariableName('example')).toBe('example');
		expect(formatBlockVariableName('')).toBe('block');
	});

	it('validates manifest structure', () => {
		const warnings = validateBlockManifest(
			{
				name: 'demo/example',
				title: 'Example',
				category: 'widgets',
				icon: 'database',
				editorScriptModule: 'file:./index.tsx',
				viewScriptModule: 'file:./view.ts',
			},
			{
				key: 'demo/example',
				directory: 'blocks/example',
				hasRender: false,
				manifestSource: 'blocks/example/block.json',
			}
		);

		expect(warnings).toHaveLength(0);
	});

	it('reports missing fields', () => {
		const warnings = validateBlockManifest(
			{},
			{
				key: 'demo/example',
				directory: 'blocks/example',
				hasRender: false,
				manifestSource: 'blocks/example/block.json',
			}
		);

		expect(warnings).toEqual(
			expect.arrayContaining([
				expect.stringContaining(
					'Block manifest for "demo/example" is missing a "name" field.'
				),
			])
		);
	});
});
