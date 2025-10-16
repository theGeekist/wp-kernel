import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type * as validationModule from '../validation';
import type { GenerationSummary } from '../types';
import { createReporterMock } from '@wpkernel/test-utils/cli';

type ValidationModule = typeof validationModule;

describe('validateGeneratedImports', () => {
	const tmpPrefix = path.join(os.tmpdir(), 'wpk-validate-imports-');
	const trackedDirs: string[] = [];

	afterEach(async () => {
		jest.resetModules();
		jest.clearAllMocks();
		jest.restoreAllMocks();
		jest.resetAllMocks();
		await Promise.all(
			trackedDirs
				.splice(0)
				.map((dir) => fs.rm(dir, { recursive: true, force: true }))
		);
	});

	it('skips validation when the run is a dry-run', async () => {
		const reporter = createReporterMock();
		const summary = createSummary({
			dryRun: true,
			files: [
				{
					path: '.generated/index.ts',
					status: 'skipped',
				},
			],
		});

		const { validateGeneratedImports } = await importValidationModule();

		await expect(
			validateGeneratedImports({
				projectRoot: process.cwd(),
				summary,
				reporter,
			})
		).resolves.toBeUndefined();

		expect(reporter.debug).toHaveBeenCalledWith(
			'Skipping import validation because dry-run mode is enabled.'
		);
	});

	it('passes when generated imports resolve successfully', async () => {
		const workspace = await fs.mkdtemp(tmpPrefix);
		trackedDirs.push(workspace);
		await fs.mkdir(path.join(workspace, '.generated'), { recursive: true });

		const helperPath = path.join(workspace, '.generated/helper.ts');
		const entryPath = path.join(workspace, '.generated/index.ts');

		await fs.writeFile(
			helperPath,
			'export const greet = () => "hi";\n',
			'utf8'
		);
		await fs.writeFile(
			entryPath,
			"import { greet } from './helper';\nexport const value = greet();\n",
			'utf8'
		);

		const reporter = createReporterMock();
		const summary = createSummary({
			dryRun: false,
			files: [
				{
					path: path.relative(workspace, entryPath),
					status: 'written',
				},
				{
					path: path.relative(workspace, helperPath),
					status: 'written',
				},
			],
		});

		const { validateGeneratedImports } = await importValidationModule();

		await expect(
			validateGeneratedImports({
				projectRoot: workspace,
				summary,
				reporter,
			})
		).resolves.toBeUndefined();

		expect(reporter.debug).toHaveBeenCalledWith(
			'Module export validation passed for generated artifacts.',
			expect.objectContaining({
				checkedFiles: summary.entries.map((entry) => entry.path),
			})
		);
	});

	it('throws a KernelError when imports reference missing kernel modules', async () => {
		const workspace = await fs.mkdtemp(tmpPrefix);
		trackedDirs.push(workspace);
		await fs.mkdir(path.join(workspace, '.generated'), { recursive: true });

		const entryPath = path.join(workspace, '.generated/index.ts');

		await fs.writeFile(
			entryPath,
			"import { missing } from '@wpkernel/not-a-module';\nexport const value = missing;\n",
			'utf8'
		);

		const reporter = createReporterMock();
		const summary = createSummary({
			dryRun: false,
			files: [
				{
					path: path.relative(workspace, entryPath),
					status: 'written',
				},
			],
		});

		const { validateGeneratedImports } = await importValidationModule();

		await expect(
			validateGeneratedImports({
				projectRoot: workspace,
				summary,
				reporter,
			})
		).rejects.toMatchObject({
			code: 'ValidationError',
			message: expect.stringContaining('Generated artifacts reference'),
		});
	});

	it('warns and skips when TypeScript is missing', async () => {
		const workspace = await fs.mkdtemp(tmpPrefix);
		trackedDirs.push(workspace);
		await fs.mkdir(path.join(workspace, '.generated'), { recursive: true });

		const entryPath = path.join(workspace, '.generated/index.ts');
		await fs.writeFile(entryPath, 'export const value = 1;\n', 'utf8');

		const reporter = createReporterMock();
		const summary = createSummary({
			dryRun: false,
			files: [
				{
					path: path.relative(workspace, entryPath),
					status: 'written',
				},
			],
		});

		const { validateGeneratedImports } = await importValidationModule({
			mockTypeScriptMissing: true,
		});

		await expect(
			validateGeneratedImports({
				projectRoot: workspace,
				summary,
				reporter,
			})
		).resolves.toBeUndefined();

		expect(reporter.warn).toHaveBeenCalledWith(
			'Skipping generated import validation because TypeScript is not installed. Install it to enable validation.'
		);
	});
});

function createSummary({
	dryRun,
	files,
}: {
	dryRun: boolean;
	files: Array<{ path: string; status: 'written' | 'unchanged' | 'skipped' }>;
}): GenerationSummary {
	const counts = { written: 0, unchanged: 0, skipped: 0 };
	const entries = files.map((file) => {
		counts[file.status] += 1;
		return { path: file.path, status: file.status, hash: 'hash' };
	});

	return {
		dryRun,
		counts,
		entries,
	};
}

async function importValidationModule({
	mockTypeScriptMissing = false,
}: {
	mockTypeScriptMissing?: boolean;
} = {}): Promise<ValidationModule> {
	jest.resetModules();

	if (mockTypeScriptMissing) {
		jest.doMock('typescript', () => {
			const error = new Error("Cannot find module 'typescript'");
			(error as NodeJS.ErrnoException).code = 'MODULE_NOT_FOUND';
			throw error;
		});
	}

	let importedModule: ValidationModule | undefined;

	await jest.isolateModulesAsync(async () => {
		importedModule = await import('../validation');
	});

	if (!importedModule) {
		throw new Error('Unable to import validation module for testing.');
	}

	return importedModule;
}
