import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

async function withWorkspace<T>(run: (root: string) => Promise<T>): Promise<T> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-import-meta-'));
	try {
		return await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

function buildReporter() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildOutput() {
	const actions: Array<{ file: string; contents: string }> = [];
	return {
		actions,
		queueWrite(action: { file: string; contents: string }) {
			actions.push(action);
		},
	};
}

describe('createApplyPlanBuilder pretty printer wiring', () => {
	afterEach(() => {
		jest.resetModules();
		jest.restoreAllMocks();
	});

	it('passes the resolved bridge script path to the PHP driver', async () => {
		jest.resetModules();

		const prettyPrinterFactory = jest.fn(() => ({
			prettyPrint: jest.fn(async () => ({ code: '<?php\n', ast: [] })),
		}));

		jest.doMock('@wpkernel/php-driver', () => {
			const actual = jest.requireActual('@wpkernel/php-driver');
			return {
				...actual,
				buildPhpPrettyPrinter: prettyPrinterFactory,
			} satisfies typeof actual;
		});

		const { createApplyPlanBuilder } = await import('../plan');
		const { buildWorkspace } = await import('../../workspace');
		const { buildEmptyGenerationState } = await import(
			'../../apply/manifest'
		);
		const { makePhpIrFixture } = await import(
			'@wpkernel/test-utils/builders/php/resources.test-support'
		);

		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();
			const helper = createApplyPlanBuilder();
			const ir = makePhpIrFixture();

			await helper.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: {
							config: ir.config,
							namespace: ir.meta.namespace,
							origin: ir.meta.origin,
							sourcePath: path.join(
								workspaceRoot,
								'wpk.config.ts'
							),
						},
						ir,
					},
					output,
					reporter,
				},
				undefined
			);
		});

		expect(prettyPrinterFactory).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace: expect.any(Object),
				scriptPath: expect.stringContaining('/php/pretty-print.php'),
			})
		);
	});
});
