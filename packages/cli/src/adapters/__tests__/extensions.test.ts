import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runAdapterExtensions } from '..';
import { KernelError } from '@geekist/wp-kernel';
import type { AdapterContext, AdapterExtension } from '../../config/types';
import type { IRv1 } from '../../ir';
import { FileWriter } from '../../utils/file-writer';
import type { Reporter } from '@geekist/wp-kernel';

const TMP_OUTPUT = path.join(os.tmpdir(), 'wpk-extension-output-');

describe('runAdapterExtensions', () => {
	it('queues files in a sandbox and commits them after printers succeed', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const writer = new FileWriter();
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'telemetry',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(
						path.join(dir, 'telemetry.json'),
						JSON.stringify({ events: [] })
					);
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async (filePath, contents) => {
					await writer.write(filePath, contents);
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			const telemetryPath = path.join(outputDir, 'telemetry.json');
			await expect(fs.stat(telemetryPath)).rejects.toMatchObject({
				code: 'ENOENT',
			});

			await run.commit();

			const contents = await fs.readFile(telemetryPath, 'utf8');
			expect(JSON.parse(contents)).toEqual({ events: [] });

			const summary = writer.summarise();
			expect(summary.counts.written).toBe(1);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('rolls back sandbox files when printers fail', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'docs',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(path.join(dir, 'docs.md'), '# Docs');
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async () => {
					throw new Error('should not write');
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			await expect(run.rollback()).resolves.toBeUndefined();

			await expect(
				fs.stat(path.join(outputDir, 'docs.md'))
			).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('reports extension failures and prevents partial writes', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'fail',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(path.join(dir, 'partial.txt'), 'data');
					throw new Error('boom');
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async (directoryPath: string) => {
						await fs.mkdir(directoryPath, { recursive: true });
					},
					writeFile: async () => {
						throw new Error('should not write');
					},
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toThrow('boom');

			expect(reporter.error).toHaveBeenCalled();
			await expect(
				fs.stat(path.join(outputDir, 'partial.txt'))
			).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('returns early when no extensions are provided', async () => {
		const ir = createIr();
		const reporter = createReporterMock();
		const adapterContext = createAdapterContext(reporter, ir);

		const run = await runAdapterExtensions({
			extensions: [],
			adapterContext,
			ir,
			outputDir: '/tmp/unused',
			ensureDirectory: async () => {
				throw new Error('should not ensure directory');
			},
			writeFile: async () => {
				throw new Error('should not write');
			},
			configDirectory: undefined,
			formatPhp: async () => '',
			formatTs: async () => '',
		});

		expect(run.ir).toBe(ir);
		await expect(run.commit()).resolves.toBeUndefined();
		await expect(run.rollback()).resolves.toBeUndefined();
	});

	it('supports multiple commit calls without rewriting files', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const writer = new FileWriter();
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'analytics',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(
						path.join(dir, 'analytics.json'),
						JSON.stringify({ enabled: true })
					);
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async (filePath, contents) => {
					await writer.write(filePath, contents);
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			await run.commit();
			await expect(run.commit()).resolves.toBeUndefined();

			const analyticsPath = path.join(outputDir, 'analytics.json');
			const contents = await fs.readFile(analyticsPath, 'utf8');
			expect(JSON.parse(contents)).toEqual({ enabled: true });
			const summary = writer.summarise();
			expect(summary.counts.written).toBe(1);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('supports multiple rollback calls', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'noop',
				async apply() {
					// no-op
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async () => {
					/* noop */
				},
				writeFile: async () => {
					/* noop */
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			await run.rollback();
			await expect(run.rollback()).resolves.toBeUndefined();
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('normalises KernelError instances thrown by extensions', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'fails-kernel-error',
				async apply() {
					throw new KernelError('DeveloperError', {
						message: 'bad extension',
					});
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => {
						/* noop */
					},
					writeFile: async () => {
						/* noop */
					},
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toBeInstanceOf(KernelError);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('falls back to JSON cloning when structuredClone is unavailable', async () => {
		const structuredCloneSpy =
			typeof globalThis.structuredClone === 'function'
				? jest
						.spyOn(
							globalThis as typeof globalThis,
							'structuredClone'
						)
						.mockImplementation(() => {
							throw new Error('structuredClone not available');
						})
				: undefined;

		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'ir-updater',
				async apply({ updateIr, ir: currentIr }) {
					updateIr({
						...currentIr,
						meta: {
							...currentIr.meta,
							namespace: 'UpdatedNamespace',
						},
					});
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async () => {
					/* noop */
				},
				writeFile: async () => {
					/* noop */
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			expect(run.ir.meta.namespace).toBe('UpdatedNamespace');
			expect(ir.meta.namespace).toBe('Demo\\Namespace');
		} finally {
			structuredCloneSpy?.mockRestore();
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('rejects writes outside the output directory', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'escape',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(path.join(dir, '..', 'escape.txt'), 'nope');
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async (directoryPath: string) => {
						await fs.mkdir(directoryPath, { recursive: true });
					},
					writeFile: async () => {
						throw new Error('should not write');
					},
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toThrow('Adapter extensions must write inside');

			expect(reporter.error).toHaveBeenCalled();
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});
});

function createIr(): IRv1 {
	return {
		meta: {
			version: 1,
			namespace: 'Demo\\Namespace',
			sourcePath: '/workspace/kernel.config.ts',
			origin: 'file',
			sanitizedNamespace: 'Demo\\Namespace',
		},
		schemas: [],
		resources: [],
		policies: [],
		blocks: [],
		php: {
			namespace: 'Demo\\Namespace',
			autoload: 'inc/',
			directories: { controllers: 'Rest', registration: 'Registration' },
		},
	};
}

function createAdapterContext(reporter: Reporter, ir: IRv1): AdapterContext {
	return {
		config: {
			version: 1,
			namespace: 'demo',
			schemas: {},
			resources: {},
		},
		namespace: 'Demo\\Namespace',
		reporter,
		ir,
	};
}

function createReporterMock(): Reporter {
	const reporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => reporter),
	};

	return reporter;
}
