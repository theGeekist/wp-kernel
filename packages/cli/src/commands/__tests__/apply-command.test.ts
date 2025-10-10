import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Writable } from 'node:stream';
import type { Command } from 'clipanion';
import { ApplyCommand, __testUtils } from '../apply';
import { GenerateCommand } from '../generate';

jest.mock('json-schema-to-typescript', () => ({
	compile: jest.fn(async () => 'export interface Schema {}\n'),
}));

jest.mock('prettier', () => ({
	format: jest.fn(async (contents: string) => contents),
}));

jest.mock('@prettier/plugin-php', () => ({}));

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-apply-command-');

describe('ApplyCommand', () => {
	it('fails when generated artifacts are missing', async () => {
		await withWorkspace(async (workspace) => {
			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(1);

			const stderr = (command.context.stderr as MemoryStream).toString();
			expect(stderr).toContain('Generated PHP artifacts not found');
		});
	});

	it('fails when the generated PHP path is not a directory', async () => {
		await withWorkspace(async (workspace) => {
			const generatedRoot = path.join(workspace, '.generated');
			await fs.mkdir(generatedRoot, { recursive: true });
			await fs.writeFile(
				path.join(generatedRoot, 'php'),
				'not-a-directory',
				'utf8'
			);

			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(1);

			const stderr = (command.context.stderr as MemoryStream).toString();
			expect(stderr).toContain(
				'Expected generated PHP directory to exist.'
			);
		});
	});

	it('writes generated PHP files into inc/ when missing', async () => {
		await withWorkspace(async (workspace) => {
			await runGenerate(workspace);

			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary?.counts.created).toBeGreaterThan(0);

			const generatedPath = path.join(
				workspace,
				'.generated/php/Rest/BaseController.php'
			);
			const targetPath = path.join(
				workspace,
				'inc/Rest/BaseController.php'
			);

			const generatedContents = await fs.readFile(generatedPath, 'utf8');
			const appliedContents = await fs.readFile(targetPath, 'utf8');
			expect(appliedContents).toBe(generatedContents);
		});
	});

	it('preserves manual code outside guarded regions', async () => {
		await withWorkspace(async (workspace) => {
			await runGenerate(workspace);

			const initialApply = createApplyCommand(workspace);
			expect(await initialApply.execute()).toBe(0);

			const targetPath = path.join(
				workspace,
				'inc/Rest/BaseController.php'
			);
			const manualMarker = '// CUSTOM MANUAL COMMENT';
			const originalTarget = await fs.readFile(targetPath, 'utf8');
			await fs.writeFile(
				targetPath,
				originalTarget.replace(
					'// WPK:BEGIN AUTO',
					`${manualMarker}\n// WPK:BEGIN AUTO`
				),
				'utf8'
			);

			const generatedPath = path.join(
				workspace,
				'.generated/php/Rest/BaseController.php'
			);
			const generatedContents = await fs.readFile(generatedPath, 'utf8');
			await fs.writeFile(
				generatedPath,
				generatedContents.replace(
					'// WPK:BEGIN AUTO',
					'// WPK:BEGIN AUTO\n// UPDATED AUTO CONTENT'
				),
				'utf8'
			);

			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(0);

			const appliedContents = await fs.readFile(targetPath, 'utf8');
			expect(appliedContents).toContain(manualMarker);
			expect(appliedContents).toContain('// UPDATED AUTO CONTENT');
		});
	});

	it('fails when destination file is missing markers', async () => {
		await withWorkspace(async (workspace) => {
			await runGenerate(workspace);

			const generatedPath = path.join(
				workspace,
				'.generated/php/Rest/BaseController.php'
			);
			const targetPath = path.join(
				workspace,
				'inc/Rest/BaseController.php'
			);

			await fs.mkdir(path.dirname(targetPath), { recursive: true });
			await fs.writeFile(
				targetPath,
				'<?php\n// manual file without markers\n',
				'utf8'
			);

			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(1);

			const stderr = (command.context.stderr as MemoryStream).toString();
			expect(stderr).toContain('Apply failed');

			const generatedContents = await fs.readFile(generatedPath, 'utf8');
			expect(generatedContents).toContain('// WPK:BEGIN AUTO');
		});
	});

	it('overwrites files without auto markers by replacing the whole file', async () => {
		await withWorkspace(async (workspace) => {
			await runGenerate(workspace);

			const initialApply = createApplyCommand(workspace);
			expect(await initialApply.execute()).toBe(0);

			const generatedIndex = path.join(
				workspace,
				'.generated/php/index.php'
			);
			const targetIndex = path.join(workspace, 'inc/index.php');

			await fs.writeFile(
				generatedIndex,
				'<?php\ndeclare(strict_types=1);\n\nreturn [];\n',
				'utf8'
			);

			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(0);

			const generatedContents = await fs.readFile(generatedIndex, 'utf8');
			const appliedContents = await fs.readFile(targetIndex, 'utf8');
			expect(appliedContents).toBe(generatedContents);
		});
	});

	it('fails when generated markers are removed before applying', async () => {
		await withWorkspace(async (workspace) => {
			await runGenerate(workspace);

			const initialApply = createApplyCommand(workspace);
			expect(await initialApply.execute()).toBe(0);

			const generatedPath = path.join(
				workspace,
				'.generated/php/Rest/BaseController.php'
			);
			const generatedContents = await fs.readFile(generatedPath, 'utf8');
			const withoutMarkers = generatedContents
				.replace('// WPK:BEGIN AUTO', '')
				.replace('// WPK:END AUTO', '');
			await fs.writeFile(generatedPath, withoutMarkers, 'utf8');

			const command = createApplyCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(1);

			const stderr = (command.context.stderr as MemoryStream).toString();
			expect(stderr).toContain(
				'Generated artifact is missing WPK auto markers'
			);
		});
	});

	it('skips updates when no changes are detected', async () => {
		await withWorkspace(async (workspace) => {
			await runGenerate(workspace);

			const firstApply = createApplyCommand(workspace);
			expect(await firstApply.execute()).toBe(0);

			const secondApply = createApplyCommand(workspace);
			const exitCode = await secondApply.execute();
			expect(exitCode).toBe(0);
			expect(secondApply.summary?.counts.skipped ?? 0).toBeGreaterThan(0);
		});
	});

	it('serialises and formats non-error failure values', async () => {
		await withWorkspace(async (workspace) => {
			const command = createApplyCommand(workspace);
			const internals = command as unknown as {
				serialiseError: (error: unknown) => Record<string, unknown>;
				formatErrorMessage: (error: unknown) => string;
			};

			expect(internals.serialiseError('boom')).toEqual({
				message: 'boom',
			});
			expect(internals.formatErrorMessage(42)).toBe('42');
		});
	});

	it('rethrows unexpected filesystem errors when ensuring directories', async () => {
		await withWorkspace(async (workspace) => {
			const failure = Object.assign(new Error('permission denied'), {
				code: 'EACCES',
			});

			const statSpy = jest
				.spyOn(fs, 'stat')
				.mockRejectedValueOnce(failure);

			try {
				const command = createApplyCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(1);

				const stderr = (
					command.context.stderr as MemoryStream
				).toString();
				expect(stderr).toContain('permission denied');
			} finally {
				statSpy.mockRestore();
			}
		});
	});

	it('returns existing contents when auto markers cannot be matched during merge', () => {
		const { mergeAutoSections } = __testUtils;

		const existing = [
			'<?php',
			'// WPK:BEGIN AUTO',
			'// existing auto block',
			'// WPK:END AUTO',
		].join('\n');

		const generated = '<?php\n// missing auto markers';

		expect(mergeAutoSections(existing, generated)).toBe(existing);
	});
});

async function withWorkspace(
	run: (workspace: string) => Promise<void>
): Promise<void> {
	const workspace = await fs.mkdtemp(TMP_PREFIX);

	try {
		await fs.mkdir(path.join(workspace, 'schemas'), { recursive: true });
		await writeComposerJson(workspace);
		await writeKernelConfig(workspace);
		await writeSchema(workspace);

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

function createApplyCommand(workspace: string): ApplyCommand {
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

async function runGenerate(workspace: string): Promise<void> {
	const command = new GenerateCommand();
	const stdout = new MemoryStream();
	const stderr = new MemoryStream();

	command.context = {
		stdout,
		stderr,
		stdin: process.stdin,
		env: process.env,
		cwd: () => workspace,
	} as Command.Context;

	command.dryRun = false;
	command.verbose = false;

	const exitCode = await command.execute();
	if (exitCode !== 0) {
		const message = (stderr.toString() || stdout.toString()).trim();
		throw new Error(
			message
				? `Generate command failed (${exitCode}): ${message}`
				: `Generate command failed with exit code ${exitCode}`
		);
	}
}

async function writeKernelConfig(workspace: string): Promise<void> {
	const config = `module.exports = {
        version: 1,
        namespace: 'demo-plugin',
        schemas: {
                job: {
                        path: './schemas/job.schema.json',
                        generated: { types: './.generated/types/job.d.ts' },
                },
        },
        resources: {
                job: {
                        name: 'job',
                        schema: 'job',
                        routes: {
                                list: { method: 'GET', path: '/jobs' },
                                get: { method: 'GET', path: '/jobs/:id' },
                                create: { method: 'POST', path: '/jobs' },
                        },
                        cacheKeys: {
                                list: () => ['job', 'list'],
                                get: (id) => ['job', 'get', id ?? null],
                        },
                        identity: { type: 'number', param: 'id' },
                        storage: { mode: 'wp-post', postType: 'job' },
                },
        },
};
`;

	await fs.writeFile(
		path.join(workspace, 'kernel.config.js'),
		config,
		'utf8'
	);
}

async function writeComposerJson(workspace: string): Promise<void> {
	const composer = {
		name: 'demo/plugin',
		autoload: {
			'psr-4': {
				'Demo\\Plugin\\': 'inc/',
			},
		},
	};

	await fs.writeFile(
		path.join(workspace, 'composer.json'),
		JSON.stringify(composer, null, 2),
		'utf8'
	);
}

async function writeSchema(workspace: string): Promise<void> {
	const schema = {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		type: 'object',
		required: ['id'],
		properties: {
			id: { type: 'integer', description: 'Identifier' },
			title: { type: 'string', description: 'Title' },
		},
	};

	await fs.writeFile(
		path.join(workspace, 'schemas/job.schema.json'),
		JSON.stringify(schema, null, 2),
		'utf8'
	);
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
