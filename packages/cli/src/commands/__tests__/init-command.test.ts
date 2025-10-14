import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { BaseContext } from 'clipanion';
import { InitCommand } from '../init';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-init-command-');

describe('InitCommand', () => {
	it('scaffolds project files with recommended defaults', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			command.name = 'jobs-plugin';

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const stdout = command.context.stdout.toString();
			expect(stdout).toContain('created plugin scaffold for jobs-plugin');
			expect(stdout).toContain('created kernel.config.ts');
			expect(stdout).toContain('created src/index.ts');
			expect(stdout).toContain('created tsconfig.json');
			expect(stdout).toContain('created eslint.config.js');
			expect(stdout).toContain('created package.json');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toContain("namespace: 'jobs-plugin'");
			expect(kernelConfig).toContain(
				'Kernel configuration for your project.'
			);

			const indexFile = await fs.readFile(
				path.join(workspace, 'src/index.ts'),
				'utf8'
			);
			expect(indexFile).toContain('bootstrapKernel');

			const tsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'tsconfig.json'), 'utf8')
			);
			expect(tsconfig.compilerOptions).toMatchObject({
				moduleResolution: 'Bundler',
				strict: true,
			});

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);
			expect(packageJson).toMatchObject({
				name: 'jobs-plugin',
				private: true,
				type: 'module',
				scripts: {
					start: 'wpk start',
					build: 'wpk build',
					generate: 'wpk generate',
					apply: 'wpk apply',
				},
			});
		});
	});

	it('aborts when scaffold targets already exist without --force', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'// existing config',
				'utf8'
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			const stderr = command.context.stderr.toString();
			expect(stderr).toContain('Refusing to overwrite existing files');
			expect(stderr).toContain('kernel.config.ts');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toBe('// existing config');
		});
	});

	it('overwrites files and scripts when --force is provided', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			command.name = 'jobs-plugin';
			command.force = true;

			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'// stale config',
				'utf8'
			);

			await fs.writeFile(
				path.join(workspace, 'package.json'),
				JSON.stringify(
					{
						name: 'custom-package',
						scripts: {
							generate: 'custom generate',
							lint: 'eslint .',
						},
					},
					null,
					2
				)
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const stdout = command.context.stdout.toString();
			expect(stdout).toContain('updated kernel.config.ts');
			expect(stdout).toContain('updated package.json');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toContain("namespace: 'jobs-plugin'");

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);
			expect(packageJson).toMatchObject({
				name: 'jobs-plugin',
				scripts: {
					start: 'wpk start',
					build: 'wpk build',
					generate: 'wpk generate',
					apply: 'wpk apply',
					lint: 'eslint .',
				},
			});
		});
	});

	it('reports invalid package.json', async () => {
		await withWorkspace(async (workspace) => {
			const command = createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'package.json'),
				'{ invalid json',
				'utf8'
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			const stderr = command.context.stderr.toString();
			expect(stderr).toContain('package.json is not valid JSON.');
			expect(stderr).toContain('package.json');
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
