import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
	seedPlan,
	toFsPath,
	readApplyLogEntries,
} from '@wpkernel/test-utils/next/commands/apply.test-support';

const withWorkspace = buildWorkspaceRunner({
	prefix: TMP_PREFIX,
	async setup(workspace) {
		await fs.mkdir(path.join(workspace, '.git'), { recursive: true });
	},
});

describe('NextApplyCommand integration', () => {
	it('applies git patches and reports summary', async () => {
		await withWorkspace(async (workspace) => {
			const target = path.posix.join('php', 'JobController.php');
			const baseContents = ['<?php', 'class JobController {}', ''].join(
				'\n'
			);
			const incomingContents = [
				'<?php',
				'class JobController extends BaseController {}',
				'',
			].join('\n');

			await seedPlan(workspace, target, {
				base: baseContents,
				incoming: incomingContents,
				description: 'Update controller shim',
				current: baseContents,
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			const { stdout } = assignCommandContext(command, {
				cwd: workspace,
			});

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(command.records).toEqual([
				expect.objectContaining({
					file: target,
					status: 'applied',
					description: 'Update controller shim',
				}),
			]);
			expect(command.manifest?.actions).toEqual(
				expect.arrayContaining([
					target,
					path.posix.join('.wpk', 'apply', 'manifest.json'),
					path.posix.join('.wpk', 'apply', 'base', target),
				])
			);
			expect(stdout.toString()).toContain('Applied: 1');
			expect(stdout.toString()).toContain(target);

			const targetPath = toFsPath(workspace, target);
			const contents = await fs.readFile(targetPath, 'utf8');
			expect(contents).toBe(incomingContents);
		});
	});

	it('creates backups when the backup flag is set', async () => {
		await withWorkspace(async (workspace) => {
			const target = path.posix.join('php', 'BackupController.php');
			const baseContents = [
				'<?php',
				'class BackupController {}',
				'',
			].join('\n');
			const updatedContents = [
				'<?php',
				'class BackupController extends BaseController {}',
				'',
			].join('\n');

			await seedPlan(workspace, target, {
				base: baseContents,
				incoming: updatedContents,
				current: baseContents,
				description: 'Update controller shim',
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = true;
			command.force = false;
			assignCommandContext(command, { cwd: workspace });

			await command.execute();

			const backupPath = `${toFsPath(workspace, target)}.bak`;
			const backupContents = await fs.readFile(backupPath, 'utf8');
			expect(backupContents).toBe(baseContents);
		});
	});

	it('records apply runs in the workspace log', async () => {
		await withWorkspace(async (workspace) => {
			const target = path.posix.join('php', 'LogController.php');
			const baseContents = ['<?php', 'class LogController {}', ''].join(
				'\n'
			);
			const incomingContents = [
				'<?php',
				'class LogController extends Base {}',
				'',
			].join('\n');

			await seedPlan(workspace, target, {
				base: baseContents,
				incoming: incomingContents,
				current: baseContents,
				description: 'Promote controller changes',
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			assignCommandContext(command, { cwd: workspace });

			await command.execute();

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'success',
					flags: { yes: true, backup: false, force: false },
					summary: { applied: 1, conflicts: 0, skipped: 0 },
				})
			);
		});
	});

	it('returns success when no plan exists', async () => {
		await withWorkspace(async (workspace) => {
			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			const { stdout } = assignCommandContext(command, {
				cwd: workspace,
			});

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 0,
			});
			expect(command.records).toEqual([]);
			expect(stdout.toString()).toContain('No apply manifest produced');

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'skipped',
					exitCode: WPK_EXIT_CODES.SUCCESS,
					summary: { applied: 0, conflicts: 0, skipped: 0 },
				})
			);
		});
	});

	it('exits with validation error when conflicts occur', async () => {
		await withWorkspace(async (workspace) => {
			const target = path.posix.join('php', 'Conflict.php');
			const base = ['line-one', 'line-two', ''].join('\n');
			const incoming = ['line-one updated', 'line-two', ''].join('\n');
			const current = ['line-one custom', 'line-two', ''].join('\n');

			await seedPlan(workspace, target, {
				base,
				incoming,
				current,
				description: 'Introduce new logic',
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			const { stdout } = assignCommandContext(command, {
				cwd: workspace,
			});

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			expect(command.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(stdout.toString()).toContain('Conflicts: 1');

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'conflict',
					exitCode: WPK_EXIT_CODES.VALIDATION_ERROR,
					summary: { applied: 0, conflicts: 1, skipped: 0 },
				})
			);
		});
	});

	it('returns success for conflicts when force is enabled', async () => {
		await withWorkspace(async (workspace) => {
			const target = path.posix.join('php', 'Forced.php');
			const base = ['original', ''].join('\n');
			const incoming = ['updated', ''].join('\n');
			const current = ['custom', ''].join('\n');

			await seedPlan(workspace, target, {
				base,
				incoming,
				current,
				description: 'Introduce conflict',
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = true;
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'conflict',
					exitCode: WPK_EXIT_CODES.SUCCESS,
					flags: { yes: true, backup: false, force: true },
				})
			);
		});
	});
});
