import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { IRv1 } from '../../../ir/types';
import { createWorkspace } from '../../workspace';
import { createPhpBuilder } from '../php';
import type { BuilderOutput } from '../../runtime/types';

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
			expect(output.queueWrite).toHaveBeenCalled();
			const queuedFiles = output.queueWrite.mock.calls.map(
				([action]) => action.file
			);
			expect(queuedFiles).toContain(
				path.join('.generated', 'php', 'Rest', 'BaseController.php')
			);
		});
	});
});
