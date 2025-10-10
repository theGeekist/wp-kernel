import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Writable } from 'node:stream';
import type { Command } from 'clipanion';
import { ApplyCommand } from '../apply';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-apply-command-');

const GUARDED_SOURCE = `<?php
// WPK:BEGIN AUTO
return 'generated';
// WPK:END AUTO
`;

const UNGUARDED_SOURCE = `<?php
return 'generated';
`;

const GUARDED_EXISTING = `<?php
// Manual header
// WPK:BEGIN AUTO
return 'manual';
// WPK:END AUTO
// Manual footer
`;

describe('ApplyCommand', () => {
	it('creates new files when target is missing', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(
				workspace,
				'Rest/BaseController.php',
				GUARDED_SOURCE
			);

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 1,
				updated: 0,
				skipped: 0,
			});

			const target = path.join(workspace, 'inc/Rest/BaseController.php');
			const contents = await fs.readFile(target, 'utf8');
			expect(contents).toBe(GUARDED_SOURCE);
		});
	});

	it('merges guarded sections while preserving manual edits', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(
				workspace,
				'Rest/BaseController.php',
				GUARDED_SOURCE
			);

			const target = path.join(workspace, 'inc/Rest/BaseController.php');
			await ensureDirectory(path.dirname(target));
			await fs.writeFile(target, GUARDED_EXISTING, 'utf8');

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 0,
				updated: 1,
				skipped: 0,
			});

			const contents = await fs.readFile(target, 'utf8');
			expect(contents).toBe(`<?php
// Manual header
// WPK:BEGIN AUTO
return 'generated';
// WPK:END AUTO
// Manual footer
`);
		});
	});

	it('fails when guarded source lacks destination markers', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(
				workspace,
				'Rest/BaseController.php',
				GUARDED_SOURCE
			);

			const target = path.join(workspace, 'inc/Rest/BaseController.php');
			await ensureDirectory(path.dirname(target));
			await fs.writeFile(
				target,
				`<?php
// Manual header without guard markers.
return 'manual';
`,
				'utf8'
			);

			const baseline = await fs.readFile(target, 'utf8');

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(1);
			expect(command.summary).toBeNull();

			const contents = await fs.readFile(target, 'utf8');
			expect(contents).toBe(baseline);
		});
	});

	it('skips files with no changes', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(
				workspace,
				'Rest/BaseController.php',
				GUARDED_SOURCE
			);

			const target = path.join(workspace, 'inc/Rest/BaseController.php');
			await ensureDirectory(path.dirname(target));
			await fs.writeFile(target, GUARDED_SOURCE, 'utf8');

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 0,
				updated: 0,
				skipped: 1,
			});

			const contents = await fs.readFile(target, 'utf8');
			expect(contents).toBe(GUARDED_SOURCE);
		});
	});

	it('skips when no generated PHP directory exists', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 0,
				updated: 0,
				skipped: 0,
			});
		});
	});

	it('ignores generated PHP paths that are files', async () => {
		await withWorkspace(async (workspace) => {
			const filePath = path.join(workspace, '.generated/php');
			await ensureDirectory(path.dirname(filePath));
			await fs.writeFile(filePath, '<?php\n', 'utf8');

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 0,
				updated: 0,
				skipped: 0,
			});
		});
	});

	it('updates unguarded files when contents change', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(workspace, 'index.php', UNGUARDED_SOURCE);

			const target = path.join(workspace, 'inc/index.php');
			await ensureDirectory(path.dirname(target));
			await fs.writeFile(
				target,
				`<?php
return 'manual';
`,
				'utf8'
			);

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 0,
				updated: 1,
				skipped: 0,
			});

			const contents = await fs.readFile(target, 'utf8');
			expect(contents).toBe(UNGUARDED_SOURCE);
		});
	});

	it('skips unguarded files without changes', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(workspace, 'index.php', UNGUARDED_SOURCE);

			const target = path.join(workspace, 'inc/index.php');
			await ensureDirectory(path.dirname(target));
			await fs.writeFile(target, UNGUARDED_SOURCE, 'utf8');

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toEqual({
				created: 0,
				updated: 0,
				skipped: 1,
			});

			const contents = await fs.readFile(target, 'utf8');
			expect(contents).toBe(UNGUARDED_SOURCE);
		});
	});

	it('fails when the destination path is a directory', async () => {
		await withWorkspace(async (workspace) => {
			await writeGeneratedFile(workspace, 'index.php', UNGUARDED_SOURCE);

			const target = path.join(workspace, 'inc/index.php');
			await fs.mkdir(target, { recursive: true });

			const command = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(1);
			expect(command.summary).toBeNull();
		});
	});
});

async function withWorkspace(
	run: (workspace: string) => Promise<void>
): Promise<void> {
	const workspace = await fs.mkdtemp(TMP_PREFIX);

	try {
		const originalCwd = process.cwd();
		process.chdir(workspace);
		try {
			await run(workspace);
		} finally {
			process.chdir(originalCwd);
		}
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
}

async function writeGeneratedFile(
	workspace: string,
	relativePath: string,
	contents: string
): Promise<void> {
	const filePath = path.join(workspace, '.generated/php', relativePath);
	await ensureDirectory(path.dirname(filePath));
	await fs.writeFile(filePath, contents, 'utf8');
}

async function ensureDirectory(directory: string): Promise<void> {
	await fs.mkdir(directory, { recursive: true });
}

function createCommand(workspace: string): ApplyCommand {
	const command = new ApplyCommand();
	const stdout = new MemoryStream();
	const stderr = new MemoryStream();

	command.context = {
		stdout,
		stderr,
		stdin: process.stdin,
		env: process.env,
		cwd: () => workspace,
	} as Command.Context;

	return command;
}

class MemoryStream extends Writable {
	private readonly chunks: string[] = [];

	override _write(
		chunk: string | Buffer,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void
	): void {
		this.chunks.push(chunk.toString());
		callback();
	}

	toString(): string {
		return this.chunks.join('');
	}
}
