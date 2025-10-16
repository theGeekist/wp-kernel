import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { GenerateCommand } from '../generate';
import * as printers from '../../printers';
import * as ir from '../../ir';
import { EXIT_CODES } from '../run-generate/types';
import { KernelError } from '@wpkernel/core/contracts';
import { assignCommandContext } from '../../../tests/cli-command.test-support';
import { createWorkspaceRunner } from '../../../tests/workspace.test-support';

jest.mock('json-schema-to-typescript', () => ({
	compile: jest.fn(async () => 'export interface Schema {}\n'),
}));

jest.mock('prettier', () => ({
	format: jest.fn(async (contents: string) => contents),
}));

jest.mock('@prettier/plugin-php', () => ({}));

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-generate-command-');

const runWorkspace = createWorkspaceRunner({ prefix: TMP_PREFIX });

describe('GenerateCommand', () => {
	it('writes generated artifacts and records summary', async () => {
		await withWorkspace(async (workspace) => {
			const { command } = createCommand(workspace);
			const exitCode = await command.execute();

			expect(exitCode).toBe(EXIT_CODES.SUCCESS);
			expect(command.summary?.counts.written).toBeGreaterThan(0);

			const actual = await snapshotGeneratedOutput(workspace);

			if (process.env.UPDATE_CLI_GOLDENS === '1') {
				await writeGoldenFixture('default', actual);
			}

			const expected = await loadGoldenFixture('default');

			expect(actual).toEqual(expected);
		});
	});

	it('skips unchanged files on subsequent runs', async () => {
		await withWorkspace(async (workspace) => {
			const { command } = createCommand(workspace);
			const firstExitCode = await command.execute();
			expect(firstExitCode).toBe(EXIT_CODES.SUCCESS);

			const baseControllerPath = path.join(
				workspace,
				'.generated/php/Rest/BaseController.php'
			);
			const initialStat = await fs.stat(baseControllerPath);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const { command: secondCommand } = createCommand(workspace);
			const exitCode = await secondCommand.execute();
			expect(exitCode).toBe(EXIT_CODES.SUCCESS);
			expect(secondCommand.summary?.counts.unchanged).toBeGreaterThan(0);

			const secondStat = await fs.stat(baseControllerPath);
			expect(secondStat.mtimeMs).toBe(initialStat.mtimeMs);
		});
	});

	it('performs dry-run without writing artifacts', async () => {
		await withWorkspace(async (workspace) => {
			const { command } = createCommand(workspace);
			const firstExitCode = await command.execute();
			expect(firstExitCode).toBe(EXIT_CODES.SUCCESS);

			const baseControllerPath = path.join(
				workspace,
				'.generated/php/Rest/BaseController.php'
			);
			const baseline = await fs.readFile(baseControllerPath, 'utf8');

			const schemaPath = path.join(workspace, 'schemas/job.schema.json');
			const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
			schema.properties.title.description = 'Updated title';
			await fs.writeFile(
				schemaPath,
				JSON.stringify(schema, null, 2),
				'utf8'
			);

			const { command: dryRunCommand } = createCommand(workspace);
			dryRunCommand.dryRun = true;
			const exitCode = await dryRunCommand.execute();

			expect(exitCode).toBe(EXIT_CODES.SUCCESS);
			expect(dryRunCommand.summary?.dryRun).toBe(true);
			const counts = dryRunCommand.summary?.counts ?? {
				skipped: 0,
				unchanged: 0,
				written: 0,
			};
			expect(counts.skipped + counts.unchanged).toBeGreaterThan(0);

			const afterDryRun = await fs.readFile(baseControllerPath, 'utf8');
			expect(afterDryRun).toBe(baseline);
		});
	});

	it('returns exit code 1 when validation fails', async () => {
		await withWorkspace(async (workspace) => {
			await writeComposerJson(workspace, {
				autoload: { 'psr-4': { 'Demo\\Plugin\\': 'src/' } },
			});

			const { command } = createCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
		});
	});

	it('returns exit code 1 when IR builder raises developer error', async () => {
		const buildSpy = jest.spyOn(ir, 'buildIr').mockRejectedValueOnce(
			new KernelError('DeveloperError', {
				message: 'adapter mismatch',
			})
		);

		await withWorkspace(async (workspace) => {
			const { command } = createCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
		});

		buildSpy.mockRestore();
	});

	it('returns exit code 3 when adapter throws', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					phpAdapter: '() => { throw new Error("adapter boom"); }',
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
			},
			{ withDefaultConfig: false }
		);
	});

	it('runs adapter extensions and commits queued files', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [
						`() => ({
                                                        name: 'telemetry',
                                                        async apply({ queueFile, outputDir }) {
                                                                const path = require('node:path');
                                                                await queueFile(
                                                                        path.join(outputDir, 'telemetry.json'),
                                                                        JSON.stringify({ event: 'generated' })
                                                                );
                                                        },
                                                })`,
					],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.SUCCESS);

				const telemetryPath = path.join(
					workspace,
					'.generated',
					'telemetry.json'
				);
				const telemetry = await fs.readFile(telemetryPath, 'utf8');
				expect(JSON.parse(telemetry)).toEqual({ event: 'generated' });
			},
			{ withDefaultConfig: false }
		);
	});

	it('returns exit code 3 when adapter extensions fail', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [
						`() => ({
                                                        name: 'broken',
                                                        async apply({ queueFile, outputDir }) {
                                                                const path = require('node:path');
                                                                await queueFile(
                                                                        path.join(outputDir, 'broken.txt'),
                                                                        'partial'
                                                                );
                                                                throw new Error('extension boom');
                                                        },
                                                })`,
					],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);

				await expect(
					fs.stat(path.join(workspace, '.generated', 'broken.txt'))
				).rejects.toMatchObject({ code: 'ENOENT' });
			},
			{ withDefaultConfig: false }
		);
	});

	it('returns exit code 3 when adapter extension factory throws', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [`() => { throw new Error('factory boom'); }`],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
			},
			{ withDefaultConfig: false }
		);
	});

	it('returns exit code 3 when adapter extension is invalid', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [
						`() => ({
                                                        name: '   ',
                                                        async apply() {}
                                                })`,
						`() => ({ apply() {} })`,
					],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
			},
			{ withDefaultConfig: false }
		);
	});

	it('succeeds when adapter extension factory returns nothing', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [`() => { return; }`, `() => []`],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.SUCCESS);
			},
			{ withDefaultConfig: false }
		);
	});

	it('returns exit code 3 when adapter extension result is null', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [`() => [null]`],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
			},
			{ withDefaultConfig: false }
		);
	});

	it('returns exit code 3 when adapter extension lacks apply', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					extensions: [`() => ({ name: 'invalid' })`],
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
			},
			{ withDefaultConfig: false }
		);
	});

	it('returns exit code 2 when printers fail', async () => {
		const emitSpy = jest
			.spyOn(printers, 'emitGeneratedArtifacts')
			.mockRejectedValue(new Error('printer boom'));

		await withWorkspace(async (workspace) => {
			const { command } = createCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(EXIT_CODES.UNEXPECTED_ERROR);
		});

		emitSpy.mockRestore();
	});

	it('serialises non-error printer failures', async () => {
		const emitSpy = jest
			.spyOn(printers, 'emitGeneratedArtifacts')
			.mockRejectedValue('printer boom');

		await withWorkspace(async (workspace) => {
			const { command } = createCommand(workspace);
			const exitCode = await command.execute();
			expect(exitCode).toBe(EXIT_CODES.UNEXPECTED_ERROR);
		});

		emitSpy.mockRestore();
	});

	it('prints verbose summaries with file listings', async () => {
		await withWorkspace(async (workspace) => {
			const { command, stdout } = createCommand(workspace);
			command.verbose = true;

			const exitCode = await command.execute();
			expect(exitCode).toBe(EXIT_CODES.SUCCESS);

			expect(stdout.toString()).toContain('files:');
		});
	});

	it('treats falsy adapters as undefined', async () => {
		await withWorkspace(
			async (workspace) => {
				await writeKernelConfig(workspace, {
					phpAdapter: '() => null',
				});

				const { command } = createCommand(workspace);
				const exitCode = await command.execute();
				expect(exitCode).toBe(EXIT_CODES.SUCCESS);
			},
			{ withDefaultConfig: false }
		);
	});
});

const GOLDEN_ROOT = path.join(__dirname, '__fixtures__');

async function loadGoldenFixture(
	name: string
): Promise<Record<string, string>> {
	const fixturePath = path.join(GOLDEN_ROOT, `${name}.json`);
	const raw = await fs.readFile(fixturePath, 'utf8');
	return JSON.parse(raw) as Record<string, string>;
}

async function snapshotGeneratedOutput(
	workspace: string
): Promise<Record<string, string>> {
	return snapshotDirectory(path.join(workspace, '.generated'));
}

async function writeGoldenFixture(
	name: string,
	snapshot: Record<string, string>
): Promise<void> {
	await fs.mkdir(GOLDEN_ROOT, { recursive: true });
	const targetPath = path.join(GOLDEN_ROOT, `${name}.json`);
	await fs.writeFile(
		targetPath,
		`${JSON.stringify(snapshot, null, 2)}\n`,
		'utf8'
	);
}

async function snapshotDirectory(
	root: string
): Promise<Record<string, string>> {
	const snapshot: Record<string, string> = {};

	await collect(root, '');

	return snapshot;

	async function collect(current: string, relative: string): Promise<void> {
		const entries = await fs.readdir(current, { withFileTypes: true });
		entries.sort((a, b) => a.name.localeCompare(b.name));

		for (const entry of entries) {
			const entryPath = path.join(current, entry.name);
			const entryRelative = relative
				? path.join(relative, entry.name)
				: entry.name;

			if (entry.isDirectory()) {
				await collect(entryPath, entryRelative);
				continue;
			}

			if (!entry.isFile()) {
				continue;
			}

			const contents = await fs.readFile(entryPath, 'utf8');
			const key = entryRelative.split(path.sep).join('/');
			snapshot[key] = contents;
		}
	}
}

async function withWorkspace(
	run: (workspace: string) => Promise<void>,
	options: { withDefaultConfig?: boolean } = {}
): Promise<void> {
	const { withDefaultConfig = true } = options;

	await runWorkspace(
		async (workspace) => {
			await run(workspace);
		},
		{
			setup: async (workspace) => {
				await fs.mkdir(path.join(workspace, 'schemas'), {
					recursive: true,
				});
				await writeComposerJson(workspace);

				if (withDefaultConfig) {
					await writeKernelConfig(workspace);
				}

				await linkKernelPackages(workspace);
				await writeSchema(workspace);
			},
		}
	);
}

function createCommand(workspace: string): {
	command: GenerateCommand;
	stdout: ReturnType<typeof assignCommandContext>['stdout'];
} {
	const command = new GenerateCommand();
	const { stdout } = assignCommandContext(command, { cwd: workspace });

	command.dryRun = false;
	command.verbose = false;

	return { command, stdout };
}

async function linkKernelPackages(workspace: string): Promise<void> {
	const packagesRoot = path.resolve(__dirname, '..', '..', '..', '..');
	const mappings: Record<string, string> = {
		'@wpkernel/core': path.join(packagesRoot, 'core'),
		'@wpkernel/ui': path.join(packagesRoot, 'ui'),
	};

	for (const [specifier, source] of Object.entries(mappings)) {
		const target = path.join(
			workspace,
			'node_modules',
			...specifier.split('/')
		);
		await fs.mkdir(path.dirname(target), { recursive: true });

		try {
			const linkType = process.platform === 'win32' ? 'junction' : 'dir';
			await fs.symlink(source, target, linkType);
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error) {
				const code = (error as { code?: string }).code;
				if (code === 'EEXIST') {
					continue;
				}
			}

			throw error;
		}
	}
}

async function writeKernelConfig(
	workspace: string,
	options: { phpAdapter?: string; extensions?: string[] } = {}
): Promise<void> {
	const { phpAdapter, extensions } = options;
	const adapterEntries: string[] = [];

	if (phpAdapter) {
		adapterEntries.push(`php: ${phpAdapter}`);
	}

	if (extensions?.length) {
		adapterEntries.push(
			`extensions: [
${extensions.map((extension) => `                        ${extension}`).join(',\n')}
                ]`
		);
	}

	const adapterSnippet = adapterEntries.length
		? `,
        adapters: {
${adapterEntries.map((entry) => `                ${entry}`).join(',\n')}
        }`
		: '';

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
        }${adapterSnippet},
};
`;

	await fs.writeFile(
		path.join(workspace, 'kernel.config.js'),
		config,
		'utf8'
	);
}

async function writeComposerJson(
	workspace: string,
	overrides: Record<string, unknown> = {}
): Promise<void> {
	const composer = {
		name: 'demo/plugin',
		autoload: {
			'psr-4': {
				'Demo\\Plugin\\': 'inc/',
			},
		},
		...overrides,
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
