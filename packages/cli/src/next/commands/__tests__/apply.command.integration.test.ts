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
} from '@wpkernel/test-utils/next/commands/apply.test-support';

const withWorkspace = buildWorkspaceRunner({ prefix: TMP_PREFIX });

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
			expect(stdout.toString()).toContain('Applied: 1');
			expect(stdout.toString()).toContain(target);

			const targetPath = toFsPath(workspace, target);
			const contents = await fs.readFile(targetPath, 'utf8');
			expect(contents).toBe(incomingContents);
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
		});
	});
});
