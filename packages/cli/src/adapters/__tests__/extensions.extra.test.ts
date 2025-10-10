import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runAdapterExtensions } from '..';
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
});
