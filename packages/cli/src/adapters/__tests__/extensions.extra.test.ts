import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runAdapterExtensions } from '..';
import {
	sanitizeNamespace,
	resolveOutputRoot,
	validateSandboxTarget,
	safeLstat,
	assertWithinOutput,
	isWithinRoot,
	stripFunctions,
	serialiseError,
	normaliseError,
	assertValidExtension,
} from '../extensions';
import { KernelError } from '@geekist/wp-kernel/error';
import type { AdapterContext } from '../../config/types';
import type { IRv1 } from '../../ir';
import type { Reporter } from '@geekist/wp-kernel';

const TMP_OUTPUT = path.join(os.tmpdir(), 'wpk-extension-output-');

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
	} as unknown as IRv1;
}

function createAdapterContext(reporter: Reporter, ir: IRv1): AdapterContext {
	return {
		config: { version: 1, namespace: 'demo', schemas: {}, resources: {} },
		namespace: 'Demo\\Namespace',
		reporter,
		ir,
	} as unknown as AdapterContext;
}

function createReporterMock(): Reporter {
	const reporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => reporter),
	} as unknown as Reporter;

	return reporter;
}

describe('runAdapterExtensions extra branches', () => {
	it('throws when extension is undefined/null', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();
		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);

			await expect(
				runAdapterExtensions({
					// intentionally invalid extension
					extensions: [undefined as unknown as any],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => {},
					writeFile: async () => {},
					configDirectory: undefined,
					formatPhp: async (_f: string, c: string) => c,
					formatTs: async (_f: string, c: string) => c,
				} as any)
			).rejects.toThrow(
				'Invalid adapter extension returned from factory.'
			);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('throws when extension has empty name', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();
		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);

			const badExt = { name: '', apply: async () => {} } as any;

			await expect(
				runAdapterExtensions({
					extensions: [badExt],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => {},
					writeFile: async () => {},
					configDirectory: undefined,
					formatPhp: async (_f: string, c: string) => c,
					formatTs: async (_f: string, c: string) => c,
				} as any)
			).rejects.toThrow(
				'Adapter extensions must provide a non-empty name.'
			);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('throws when extension omits an apply function', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();
		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);

			const badExt = { name: 'missing-apply' } as any;

			await expect(
				runAdapterExtensions({
					extensions: [badExt],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => {},
					writeFile: async () => {},
					configDirectory: undefined,
					formatPhp: async (_f: string, c: string) => c,
					formatTs: async (_f: string, c: string) => c,
				} as any)
			).rejects.toThrow(
				'Adapter extensions must define an apply() function.'
			);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('allows queued files that traverse symlinks remaining within outputDir', async () => {
		if (process.platform === 'win32') {
			return;
		}

		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const innerDir = path.join(outputDir, 'actual');
			await fs.mkdir(innerDir, { recursive: true });
			await fs.symlink(innerDir, path.join(outputDir, 'link'), 'dir');

			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);

			const extension = {
				name: 'within',
				async apply({
					queueFile,
					outputDir: dir,
				}: {
					queueFile: (path: string, content: string) => Promise<void>;
					outputDir: string;
				}) {
					await queueFile(path.join(dir, 'link', 'ok.txt'), 'inside');
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
					await fs.writeFile(filePath, contents, 'utf8');
				},
				configDirectory: undefined,
				formatPhp: async (_filePath: string, contents: string) =>
					contents,
				formatTs: async (_filePath: string, contents: string) =>
					contents,
			});

			await run.commit();

			const written = await fs.readFile(
				path.join(innerDir, 'ok.txt'),
				'utf8'
			);
			expect(written).toBe('inside');
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('creates the output directory when it does not exist', async () => {
		const parent = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-extension-missing-')
		);
		const outputDir = path.join(parent, 'new-output');
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);

			const extension = {
				name: 'create',
				async apply({
					queueFile,
					outputDir: dir,
				}: {
					queueFile: (path: string, content: string) => Promise<void>;
					outputDir: string;
				}) {
					await queueFile(path.join(dir, 'generated.json'), '{}');
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
					await fs.writeFile(filePath, contents, 'utf8');
				},
				configDirectory: undefined,
				formatPhp: async (_filePath: string, contents: string) =>
					contents,
				formatTs: async (_filePath: string, contents: string) =>
					contents,
			});

			await run.commit();
			const exists = await fs.readFile(
				path.join(outputDir, 'generated.json'),
				'utf8'
			);
			expect(exists).toBe('{}');
		} finally {
			await fs.rm(parent, { recursive: true, force: true });
		}
	});

	it('handles circular structures when cloning IR', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const shared: Record<string, unknown> = {};
			const circular = { ref: shared };
			shared.loop = circular;
			(ir as unknown as Record<string, unknown>).resources = [
				shared as unknown,
			];
			const adapterContext = createAdapterContext(reporter, ir);
			const extension = {
				name: 'circular',
				async apply() {
					// no-op, just ensure traversal succeeds
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => undefined,
					writeFile: async () => undefined,
					configDirectory: undefined,
					formatPhp: async (_filePath: string, contents: string) =>
						contents,
					formatTs: async (_filePath: string, contents: string) =>
						contents,
				})
			).resolves.toBeDefined();
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('normalises thrown non-Error values (string) and reports error', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();
		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension = {
				name: 'string-thrower',
				async apply() {
					throw 'boom-string';
				},
			} as any;

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => {},
					writeFile: async () => {},
					configDirectory: undefined,
					formatPhp: async (_f: string, c: string) => c,
					formatTs: async (_f: string, c: string) => c,
				} as any)
			).rejects.toThrow('boom-string');

			expect(reporter.error).toHaveBeenCalled();
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('sanitises namespaces for reporters', () => {
		expect(sanitizeNamespace('My Extension!')).toBe('my-extension');
		expect(sanitizeNamespace('Already-clean')).toBe('already-clean');
	});

	it('rethrows unexpected errors when resolving output root', async () => {
		const boom = Object.assign(new Error('fail'), { code: 'EACCES' });
		const realpath = jest
			.spyOn(fs, 'realpath')
			.mockRejectedValueOnce(boom as never);

		await expect(resolveOutputRoot('/tmp/forbidden')).rejects.toBe(boom);

		realpath.mockRestore();
	});

	it('validates sandbox targets across symlinks', async () => {
		if (process.platform === 'win32') {
			return;
		}

		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const actualDir = path.join(outputDir, 'actual');
		const linkDir = path.join(outputDir, 'link');
		await fs.mkdir(actualDir, { recursive: true });
		await fs.symlink(actualDir, linkDir, 'dir');

		const originFile = path.join(actualDir, 'origin.txt');
		await fs.writeFile(originFile, 'data');
		const linkFile = path.join(linkDir, 'file.txt');
		await fs.symlink(originFile, linkFile);

		const outputRoot = await fs.realpath(outputDir);
		await expect(
			validateSandboxTarget({
				targetPath: linkFile,
				relativeTarget: path.relative(outputDir, linkFile),
				outputRoot,
				outputDir,
			})
		).resolves.toBeUndefined();

		await fs.rm(outputDir, { recursive: true, force: true });
	});

	it('detects sandbox escapes via assertWithinOutput', async () => {
		const tmp = await fs.mkdtemp(TMP_OUTPUT);
		const outside = path.join(os.tmpdir(), 'wpk-outside');
		await fs.mkdir(outside, { recursive: true });
		try {
			await expect(
				assertWithinOutput(outside, await fs.realpath(tmp))
			).rejects.toThrow('Adapter extensions must not escape');
		} finally {
			await fs.rm(outside, { recursive: true, force: true });
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it('wraps unknown lstat failures in safeLstat', async () => {
		const error = Object.assign(new Error('bad lstat'), { code: 'EACCES' });
		const spy = jest
			.spyOn(fs, 'lstat')
			.mockRejectedValueOnce(error as never);

		await expect(safeLstat('/tmp/missing')).rejects.toBe(error);

		spy.mockRestore();
	});

	it('evaluates root containment helpers', async () => {
		const tmp = await fs.mkdtemp(TMP_OUTPUT);
		const root = await fs.realpath(tmp);
		const inside = path.join(root, 'child');
		const outside = path.join(root, '..', 'sibling');

		expect(isWithinRoot(inside, root)).toBe(true);
		expect(isWithinRoot(outside, root)).toBe(false);

		await fs.rm(tmp, { recursive: true, force: true });
	});

	it('strips functions while preserving circular references', () => {
		const array: unknown[] = [];
		array.push(array);
		array.push(() => 'ignored');

		const object: Record<string, unknown> = { array };
		object.self = object;
		object.fn = () => 'skip';

		const clone = stripFunctions(object) as Record<string, unknown>;

		expect(clone.fn).toBeUndefined();
		const clonedArray = clone.array as unknown[];
		expect(clonedArray[0]).toBe(clonedArray);
		expect(clonedArray).toHaveLength(1);
		expect(clone.self).toBe(clone);
	});

	it('serialises unknown errors safely', () => {
		expect(serialiseError('boom')).toEqual({ message: 'boom' });
	});

	it('normalises kernel errors and primitives', () => {
		const kernelError = new KernelError('DeveloperError', {
			message: 'bad',
		});
		expect(normaliseError(kernelError)).toBe(kernelError);
		const normalised = normaliseError('oops');
		expect(normalised).toBeInstanceOf(Error);
		expect(normalised.message).toBe('oops');
	});

	it('asserts extension validity directly', () => {
		expect(() => assertValidExtension(null)).toThrow(
			'Invalid adapter extension returned from factory.'
		);
		expect(() =>
			assertValidExtension({ name: '  ', apply: async () => {} } as any)
		).toThrow('Adapter extensions must provide a non-empty name.');
	});
});
