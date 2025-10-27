import path from 'node:path';
import {
	buildModuleSpecifier,
	buildBlockRegistrarMetadata,
	buildAutoRegisterModuleMetadata,
	formatBlockVariableName,
	generateBlockImportPath,
	resolveKernelImport,
	resolveResourceImport,
	toCamelCase,
	toPascalCase,
} from '..';
import { withWorkspace } from '@wpkernel/test-utils/next/builders/tests/ts.test-support';

describe('ts shared helpers', () => {
	describe('module specifiers', () => {
		it('builds a relative specifier for workspace targets', async () => {
			await withWorkspace(async ({ workspace }) => {
				const specifier = buildModuleSpecifier({
					workspace,
					from: path.join(
						'.generated',
						'ui',
						'fixtures',
						'dataviews',
						'job.ts'
					),
					target: path.join('src', 'resources', 'job.ts'),
				});

				expect(specifier).toBe('../../../../src/resources/job');
			});
		});

		it('uses the workspace alias when the target is outside the root', async () => {
			await withWorkspace(async ({ workspace, root }) => {
				const external = path.join(
					path.dirname(root),
					'external',
					'module.ts'
				);
				const specifier = buildModuleSpecifier({
					workspace,
					from: path.join('.generated', 'index.ts'),
					target: external,
				});

				expect(specifier).toBe('@/external/module');
			});
		});
	});

	describe('resolveResourceImport', () => {
		it('prefers the configured specifier when provided', async () => {
			await withWorkspace(async ({ workspace }) => {
				await expect(
					resolveResourceImport({
						workspace,
						from: 'generated.ts',
						resourceKey: 'job',
						configured: '@/custom/job-resource',
					})
				).resolves.toBe('@/custom/job-resource');
			});
		});

		it('derives a relative specifier when a matching module exists', async () => {
			await withWorkspace(async ({ workspace }) => {
				await workspace.write(
					path.join('src', 'resources', 'job.ts'),
					'export const job = {};\n'
				);

				await expect(
					resolveResourceImport({
						workspace,
						from: path.join(
							'.generated',
							'ui',
							'app',
							'job',
							'admin',
							'JobsAdminScreen.tsx'
						),
						resourceKey: 'job',
					})
				).resolves.toBe('../../../../../src/resources/job');
			});
		});

		it('falls back to the resource alias when no module resolves', async () => {
			await withWorkspace(async ({ workspace }) => {
				await expect(
					resolveResourceImport({
						workspace,
						from: 'generated.ts',
						resourceKey: 'job-board',
					})
				).resolves.toBe('@/resources/job-board');
			});
		});
	});

	describe('resolveKernelImport', () => {
		it('returns configured kernel specifier when provided', async () => {
			await withWorkspace(async ({ workspace }) => {
				await expect(
					resolveKernelImport({
						workspace,
						from: 'generated.tsx',
						configured: '@/bootstrap/custom-kernel',
					})
				).resolves.toBe('@/bootstrap/custom-kernel');
			});
		});

		it('resolves an existing kernel module within the workspace', async () => {
			await withWorkspace(async ({ workspace }) => {
				await workspace.write(
					path.join('src', 'bootstrap', 'kernel.ts'),
					'export const kernel = {};\n'
				);

				await expect(
					resolveKernelImport({
						workspace,
						from: path.join(
							'.generated',
							'ui',
							'app',
							'job',
							'admin',
							'JobsAdminScreen.tsx'
						),
					})
				).resolves.toBe('../../../../../src/bootstrap/kernel');
			});
		});

		it('falls back to the kernel alias when no module exists', async () => {
			await withWorkspace(async ({ workspace }) => {
				await expect(
					resolveKernelImport({
						workspace,
						from: 'generated.ts',
					})
				).resolves.toBe('@/bootstrap/kernel');
			});
		});
	});

	describe('metadata helpers', () => {
		it('converts values to PascalCase and camelCase', () => {
			expect(toPascalCase('jobs admin screen')).toBe('JobsAdminScreen');
			expect(toCamelCase('jobs admin screen')).toBe('jobsAdminScreen');
		});

		it('formats block variable names consistently with legacy printers', () => {
			expect(formatBlockVariableName('core/paragraph')).toBe(
				'coreParagraph'
			);
			expect(formatBlockVariableName('plugin/my-block')).toBe(
				'pluginMyBlock'
			);
			expect(formatBlockVariableName('')).toBe('block');
			expect(formatBlockVariableName('  spaced/slug  ')).toBe(
				'spacedSlug'
			);
		});

		it('builds registrar metadata derived from Task 16 audit invariants', () => {
			const metadata = buildBlockRegistrarMetadata('core/paragraph');

			expect(metadata).toEqual({
				blockKey: 'core/paragraph',
				variableName: 'coreParagraph',
				manifestIdentifier: 'coreParagraphManifest',
				settingsHelperIdentifier: 'createGeneratedBlockSettings',
			});
		});
	});

	describe('registrar module metadata', () => {
		it('returns the canonical banner and registrar metadata for JS-only blocks', () => {
			const metadata = buildAutoRegisterModuleMetadata({
				outputDir: path.join('src', 'blocks'),
				source: 'kernel config',
			});

			expect(metadata.filePath).toBe(
				path.join('src', 'blocks', 'auto-register.ts')
			);
			expect(metadata.banner).toEqual([
				'/**',
				' * AUTO-GENERATED by WP Kernel CLI.',
				' * Source: kernel config → blocks.jsOnly',
				' */',
			]);
			expect(metadata.registrationFunction).toBe(
				'registerGeneratedBlocks'
			);
			expect(metadata.settingsHelper).toBe(
				'createGeneratedBlockSettings'
			);
		});

		it('normalises block import paths relative to the registrar module', () => {
			const importPath = generateBlockImportPath(
				path.join('/project/src/blocks/post', 'block.json'),
				path.join('/project/src/blocks', 'auto-register.ts')
			);

			expect(importPath).toBe('./post/block.json');
		});

		it('preserves leading dot segments when block paths live higher in the tree', () => {
			const importPath = generateBlockImportPath(
				path.join('/project/src/blocks/feature', 'block.json'),
				path.join('/project/.generated/blocks', 'auto-register.ts')
			);

			const expected = path
				.relative(
					path.join('/project/.generated/blocks'),
					path.join('/project/src/blocks/feature', 'block.json')
				)
				.split(path.sep)
				.join('/');

			expect(importPath).toBe(expected);
		});
	});
});
