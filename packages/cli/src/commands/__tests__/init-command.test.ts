import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { BaseContext } from 'clipanion';
import { InitCommand } from '../init';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-init-command-');

describe('InitCommand', () => {
	it('prints default project information when no options supplied', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			command.name = undefined as unknown as string;
			command.template = undefined as unknown as string;
			const exit = await command.execute();

			expect(exit).toBeUndefined();
			expect(command.context.stdout.toString()).toContain(
				'[wpk] init(wp-kernel-project) using template "default" :: stub'
			);
		});
	});

	it('uses provided project name and template when options are set', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			command.name = 'awesome-app';
			command.template = 'react';

			const exit = await command.execute();

			expect(exit).toBeUndefined();
			expect(command.context.stdout.toString()).toContain(
				'[wpk] init(awesome-app) using template "react" :: stub'
			);
		});
	});
});

async function withWorkspace(
	run: (workspace: string) => Promise<void>
): Promise<void> {
	const workspace = await fs.mkdtemp(TMP_PREFIX);
	try {
		const original = process.cwd();
		process.chdir(workspace);
		try {
			await run(workspace);
		} finally {
			process.chdir(original);
		}
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
}

function createCommand(workspace: string): InitCommand {
	const command = new InitCommand();
	command.context = {
		stdout: new MemoryStream(),
		stderr: new MemoryStream(),
		stdin: process.stdin,
		env: process.env,
		cwd: () => workspace,
		colorDepth: 1,
	} as BaseContext;
	return command;
}

class MemoryStream {
	private readonly chunks: string[] = [];

	write(chunk: string): void {
		this.chunks.push(chunk);
	}

	toString(): string {
		return this.chunks.join('');
	}
}
