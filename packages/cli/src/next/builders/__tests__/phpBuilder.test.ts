import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { IRv1 } from '../../../ir/types';
import { createWorkspace } from '../../workspace';
import { createPhpBuilder } from '../php';
import type { BuilderOutput } from '../../runtime/types';

const execFileAsync = promisify(execFile);

jest.setTimeout(60000);

describe('createPhpBuilder', () => {
	const builder = createPhpBuilder();

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace: 'demo-plugin',
			sanitizedNamespace: 'DemoPlugin',
			origin: 'kernel.config.ts',
			sourcePath: 'kernel.config.ts',
		},
		config: {
			version: 1,
			namespace: 'demo-plugin',
			schemas: {},
			resources: {},
		} as IRv1['config'],
		schemas: [],
		resources: [],
		policies: [],
		policyMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: {
				capability: 'manage_options',
				appliesTo: 'resource',
			},
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace: 'Demo\\Plugin',
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	};

	async function withWorkspace<T>(
		run: (root: string) => Promise<T>
	): Promise<T> {
		const root = await fs.mkdtemp(
			path.join(os.tmpdir(), 'php-builder-workspace-')
		);

		try {
			const composerTemplate = await fs.readFile(
				path.resolve(__dirname, '../../../../composer.json'),
				'utf8'
			);
			await fs.writeFile(
				path.join(root, 'composer.json'),
				composerTemplate
			);
			await execFileAsync(
				'composer',
				['install', '--no-interaction', '--no-progress'],
				{ cwd: root }
			);

			return await run(root);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	}

	it('writes PHP artifacts and records manifest entries', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = createWorkspace(workspaceRoot);
			const reporter = createNoopReporter();
			const output: BuilderOutput = {
				actions: [],
				queueWrite: jest.fn(),
			};

			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
					},
					input: {
						phase: 'generate',
						options: {
							config: ir.config,
							namespace: ir.meta.namespace,
							origin: ir.meta.origin,
							sourcePath: path.join(
								workspaceRoot,
								ir.meta.sourcePath
							),
						},
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			const baseControllerPath = path.join(
				workspaceRoot,
				'.generated',
				'php',
				'Rest',
				'BaseController.php'
			);

			const controllerExists = await fs.readFile(
				baseControllerPath,
				'utf8'
			);

			expect(controllerExists).toContain('class BaseController');
			expect(controllerExists).toMatch(/declare\s*\(strict_types=1\);/);
			expect(output.queueWrite).toHaveBeenCalled();
			const queuedFiles = output.queueWrite.mock.calls.map(
				([action]) => action.file
			);
			expect(queuedFiles).toContain(
				path.join('.generated', 'php', 'Rest', 'BaseController.php')
			);

			const astPath = path.join(
				workspaceRoot,
				'.generated',
				'php',
				'Rest',
				'BaseController.php.ast.json'
			);
			const astContents = await fs.readFile(astPath, 'utf8');
			const astJson = JSON.parse(astContents);
			expect(Array.isArray(astJson)).toBe(true);
			expect(astJson).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nodeType: 'Stmt_Namespace',
					}),
				])
			);
			expect(queuedFiles).toContain(
				path.join(
					'.generated',
					'php',
					'Rest',
					'BaseController.php.ast.json'
				)
			);

			const lintResult = await execFileAsync('php', [
				'-l',
				baseControllerPath,
			]);
			expect(lintResult.stdout).toContain('No syntax errors');
		});
	});
});
