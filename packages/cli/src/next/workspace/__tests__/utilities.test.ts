import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Readable, Writable } from 'node:stream';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { KernelError } from '@wpkernel/core/error';
import { createReporterMock } from '@wpkernel/test-utils/cli';
import { createWorkspace } from '../filesystem';
import {
	ensureGeneratedPhpClean,
	ensureCleanDirectory,
	promptConfirm,
	toWorkspaceRelative,
	__testing,
} from '../utilities';

const execFile = promisify(execFileCallback);

async function createWorkspaceRoot(prefix: string): Promise<string> {
	return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('workspace utilities', () => {
	describe('ensureGeneratedPhpClean', () => {
		it('skips git checks when --yes is provided', async () => {
			const root = await createWorkspaceRoot('next-util-git-yes-');
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();

			await ensureGeneratedPhpClean({
				workspace,
				reporter,
				yes: true,
			});

			expect(reporter.warn).toHaveBeenCalledWith(
				'Skipping generated PHP cleanliness check (--yes provided).'
			);
			expect(reporter.debug).not.toHaveBeenCalled();
		});

		it('skips when directory is missing', async () => {
			const root = await createWorkspaceRoot('next-util-git-missing-');
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();

			await ensureGeneratedPhpClean({
				workspace,
				reporter,
				yes: false,
			});

			expect(reporter.warn).not.toHaveBeenCalled();
			expect(reporter.debug).not.toHaveBeenCalled();
		});

		it('does not throw in non-git workspaces', async () => {
			const root = await createWorkspaceRoot('next-util-git-none-');
			const generated = path.join(root, '.generated', 'php');
			await fs.mkdir(generated, { recursive: true });
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();

			await ensureGeneratedPhpClean({
				workspace,
				reporter,
				yes: false,
			});

			expect(reporter.debug).toHaveBeenCalledWith(
				'Skipping generated PHP cleanliness check (not a git repository).'
			);
		});

		it('throws when generated PHP contains uncommitted changes', async () => {
			const root = await createWorkspaceRoot('next-util-git-dirty-');
			await execFile('git', ['init'], { cwd: root });
			const generated = path.join(root, '.generated', 'php');
			await fs.mkdir(generated, { recursive: true });
			await fs.writeFile(
				path.join(generated, 'example.php'),
				'<?php echo 1;\n'
			);

			const workspace = createWorkspace(root);
			const reporter = createReporterMock();

			await expect(
				ensureGeneratedPhpClean({
					workspace,
					reporter,
					yes: false,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
			});
		});

		it('passes when git workspace is clean', async () => {
			const root = await createWorkspaceRoot('next-util-git-clean-');
			await execFile('git', ['init'], { cwd: root });
			const generated = path.join(root, '.generated', 'php');
			await fs.mkdir(generated, { recursive: true });

			const workspace = createWorkspace(root);
			const reporter = createReporterMock();

			await expect(
				ensureGeneratedPhpClean({
					workspace,
					reporter,
					yes: false,
				})
			).resolves.toBeUndefined();
		});
	});

	describe('ensureCleanDirectory', () => {
		it('creates the directory when missing', async () => {
			const root = await createWorkspaceRoot('next-util-dir-create-');
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();
			const target = path.join('build');

			await ensureCleanDirectory({
				workspace,
				directory: target,
				reporter,
			});

			const stat = await fs.stat(path.join(root, target));
			expect(stat.isDirectory()).toBe(true);
		});

		it('skips creation when missing and create is false', async () => {
			const root = await createWorkspaceRoot(
				'next-util-dir-skip-create-'
			);
			const workspace = createWorkspace(root);

			await ensureCleanDirectory({
				workspace,
				directory: 'skip',
				create: false,
			});

			await expect(
				fs.stat(path.join(root, 'skip'))
			).rejects.toMatchObject({ code: 'ENOENT' });
		});

		it('throws when directory is not empty and force is false', async () => {
			const root = await createWorkspaceRoot('next-util-dir-dirty-');
			const workspace = createWorkspace(root);
			const target = path.join('build');
			await fs.mkdir(path.join(root, target), { recursive: true });
			await fs.writeFile(
				path.join(root, target, 'asset.js'),
				'console.log(1);\n'
			);

			await expect(
				ensureCleanDirectory({
					workspace,
					directory: target,
				})
			).rejects.toBeInstanceOf(KernelError);
		});

		it('clears directory contents when force is true', async () => {
			const root = await createWorkspaceRoot('next-util-dir-force-');
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();
			const target = path.join('build');
			await fs.mkdir(path.join(root, target), { recursive: true });
			await fs.writeFile(
				path.join(root, target, 'asset.js'),
				'console.log(1);\n'
			);

			await ensureCleanDirectory({
				workspace,
				directory: target,
				force: true,
				reporter,
			});

			const entries = await fs.readdir(path.join(root, target));
			expect(entries).toHaveLength(0);
			expect(reporter.info).toHaveBeenCalledWith(
				'Clearing directory contents.',
				{
					path: 'build',
				}
			);
		});

		it('returns early for empty directories without logging', async () => {
			const root = await createWorkspaceRoot('next-util-dir-empty-');
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();
			const target = path.join('empty-dir');
			await fs.mkdir(path.join(root, target), { recursive: true });

			await ensureCleanDirectory({
				workspace,
				directory: target,
				reporter,
			});

			expect(reporter.info).not.toHaveBeenCalled();
		});

		it('throws when the target is not a directory', async () => {
			const root = await createWorkspaceRoot('next-util-dir-file-');
			const workspace = createWorkspace(root);
			const reporter = createReporterMock();
			const target = path.join('not-a-directory');
			await fs.writeFile(path.join(root, target), '');

			await expect(
				ensureCleanDirectory({
					workspace,
					directory: target,
					reporter,
				})
			).rejects.toMatchObject({ code: 'ValidationError' });
		});
	});

	describe('promptConfirm', () => {
		it('resolves to true when user answers yes', async () => {
			const input = Readable.from(['y\n']);
			const outputChunks: string[] = [];
			const output = new Writable({
				write(chunk, _encoding, callback) {
					outputChunks.push(chunk.toString());
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				input,
				output,
			});

			expect(result).toBe(true);
			expect(outputChunks.join('')).toContain('Proceed?');
		});

		it('uses the default value when input is empty', async () => {
			const input = Readable.from(['\n']);
			const output = new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				defaultValue: true,
				input,
				output,
			});

			expect(result).toBe(true);
		});

		it('resolves to false when user answers no', async () => {
			const input = Readable.from(['No\n']);
			const output = new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				defaultValue: true,
				input,
				output,
			});

			expect(result).toBe(false);
		});

		it('falls back to false when input is invalid without a default', async () => {
			const input = Readable.from(['maybe\n']);
			const output = new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				input,
				output,
			});

			expect(result).toBe(false);
		});
	});

	describe('toWorkspaceRelative', () => {
		it('normalises separators and handles root path', async () => {
			const root = await createWorkspaceRoot('next-util-relative-');
			const workspace = createWorkspace(root);
			const absolute = path.join(root, 'nested', 'file.txt');
			const relative = toWorkspaceRelative(workspace, absolute);

			expect(relative).toBe('nested/file.txt');
			expect(toWorkspaceRelative(workspace, root)).toBe('.');
		});
	});

	describe('__testing utilities', () => {
		it('formats prompts with appropriate suffixes', () => {
			expect(__testing.formatPrompt('Question?', undefined)).toBe(
				'Question? (y/n) '
			);
			expect(__testing.formatPrompt('Question?', true)).toBe(
				'Question? (Y/n) '
			);
			expect(__testing.formatPrompt('Question?', false)).toBe(
				'Question? (y/N) '
			);
		});

		it('parses boolean answers with fallbacks', () => {
			expect(__testing.parseBooleanAnswer('yes', undefined)).toBe(true);
			expect(__testing.parseBooleanAnswer('No', true)).toBe(false);
			expect(__testing.parseBooleanAnswer('  ', true)).toBe(true);
			expect(__testing.parseBooleanAnswer('maybe', undefined)).toBe(
				false
			);
		});

		it('detects missing git repositories from diverse errors', () => {
			expect(
				__testing.isGitRepositoryMissing('fatal: not a git repository')
			).toBe(true);
			expect(
				__testing.isGitRepositoryMissing({
					message: 'fatal: not a git repository',
				})
			).toBe(true);
			expect(
				__testing.isGitRepositoryMissing({
					stderr: 'fatal: not a git repository',
				})
			).toBe(true);
			expect(__testing.isGitRepositoryMissing(null)).toBe(false);
		});

		it('normalises directories relative to the workspace root', async () => {
			const root = await createWorkspaceRoot('next-util-normalise-');
			const workspace = createWorkspace(root);

			expect(__testing.normaliseDirectory(root, workspace)).toBe(root);
			expect(__testing.normaliseDirectory('nested', workspace)).toBe(
				path.join(root, 'nested')
			);
		});
	});
});
