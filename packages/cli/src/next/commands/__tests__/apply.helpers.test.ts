import {
	PATCH_MANIFEST_PATH,
	buildBuilderOutput,
	formatManifest,
	readManifest,
	resolveWorkspaceRoot,
} from '../apply';
import type { KernelConfigV1, LoadedKernelConfig } from '../../../config/types';
import type { Workspace } from '../../workspace';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';

const kernelConfig: KernelConfigV1 = {
	version: 1,
	namespace: 'Demo',
	schemas: {},
	resources: {},
};

const loadedConfig: LoadedKernelConfig = {
	config: kernelConfig,
	namespace: 'Demo',
	sourcePath: '/path/to/workspace/kernel.config.ts',
	configOrigin: 'kernel.config.ts',
	composerCheck: 'ok',
};

describe('apply command helpers', () => {
	it('creates a builder output queue', () => {
		const output = buildBuilderOutput();
		expect(output.actions).toEqual([]);

		output.queueWrite({
			file: 'file.ts',
			contents: 'content',
		});

		expect(output.actions).toHaveLength(1);
	});

	it('returns null when no manifest content is present', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn<
					ReturnType<Workspace['readText']>,
					Parameters<Workspace['readText']>
				>()
				.mockResolvedValue(null),
		});

		await expect(readManifest(workspace)).resolves.toBeNull();
	});

	it('parses manifest content and normalises values', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn<
					ReturnType<Workspace['readText']>,
					Parameters<Workspace['readText']>
				>()
				.mockResolvedValue(
					JSON.stringify({
						summary: { applied: '2', conflicts: '0', skipped: 1 },
						records: [
							{
								file: 'app/file.ts',
								status: 'applied',
								description: 'Patched file',
								details: { conflict: false },
							},
							{
								file: null,
								status: undefined,
								description: 123,
								details: 'not-object',
							},
						],
					})
				),
		});

		const manifest = await readManifest(workspace);

		expect(manifest).toEqual({
			summary: { applied: 2, conflicts: 0, skipped: 1 },
			records: [
				{
					file: 'app/file.ts',
					status: 'applied',
					description: 'Patched file',
					details: { conflict: false },
				},
				{
					file: '',
					status: 'skipped',
					description: undefined,
					details: undefined,
				},
			],
		});
	});

	it('throws a kernel error when manifest cannot be parsed', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn<
					ReturnType<Workspace['readText']>,
					Parameters<Workspace['readText']>
				>()
				.mockResolvedValue('invalid-json'),
		});

		await expect(readManifest(workspace)).rejects.toMatchObject({
			code: 'DeveloperError',
		});
	});

	it('formats manifest summaries including records', () => {
		const text = formatManifest({
			summary: { applied: 1, conflicts: 0, skipped: 0 },
			records: [
				{
					file: 'php/file.php',
					status: 'applied',
					description: 'Updated file',
				},
			],
		});

		expect(text).toContain('Apply summary:');
		expect(text).toContain('Applied: 1');
		expect(text).toContain('- [applied] php/file.php — Updated file');
	});

	it('formats manifest summaries when no records exist', () => {
		const text = formatManifest({
			summary: { applied: 0, conflicts: 0, skipped: 0 },
			records: [],
		});

		expect(text).toContain('No files were patched.');
	});

	it('resolves workspace root using the loaded config source path', () => {
		expect(resolveWorkspaceRoot(loadedConfig)).toBe('/path/to/workspace');
	});

	it('exposes the manifest path constant', () => {
		expect(PATCH_MANIFEST_PATH).toBe('.wpk/apply/manifest.json');
	});
});
