import { WPKernelError } from '@wpkernel/core/error';
import type { DependencyResolution } from '../../../commands/init/dependency-versions';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';
import type { Workspace } from '../../workspace';
import { appendPackageSummary, writePackageJson } from '../init/package-json';

const dependencyResolution: DependencyResolution = {
	source: 'registry',
	sources: ['fallback', 'registry'],
	dependencies: {
		'@wpkernel/core': '^0.6.0',
	},
	peerDependencies: {
		react: '^18.2.0',
	},
	devDependencies: {
		typescript: '^5.9.3',
		vite: '^7.1.9',
	},
};

describe('init package.json helpers', () => {
	it('writes a new package.json with defaults when none exist', async () => {
		const writes: Array<{ path: string; data: string }> = [];
		const captureWrite: Workspace['write'] = jest.fn(async (file, data) => {
			writes.push({
				path: file,
				data: data.toString(),
			});
		});
		const workspace = makeWorkspaceMock({
			readText: jest.fn().mockResolvedValue(null),
			write: captureWrite,
		});

		const status = await writePackageJson(workspace, {
			namespace: 'demo-app',
			force: false,
			dependencyResolution,
		});

		expect(status).toBe('created');
		expect(workspace.write).toHaveBeenCalledWith(
			'package.json',
			expect.any(String)
		);
		expect(writes).toHaveLength(1);
		expect(writes[0]?.data.endsWith('\n')).toBe(true);

		const parsed = JSON.parse(writes[0]?.data ?? '{}');
		expect(parsed).toMatchObject({
			name: 'demo-app',
			version: '0.1.0',
			type: 'module',
			private: true,
			scripts: {
				start: 'wpk start',
				build: 'wpk build',
				generate: 'wpk generate',
				apply: 'wpk apply',
			},
			dependencies: dependencyResolution.dependencies,
			peerDependencies: dependencyResolution.peerDependencies,
		});
		expect(parsed.devDependencies).toMatchObject(
			dependencyResolution.devDependencies
		);
	});

	it('skips rewriting the package file when contents already satisfy defaults', async () => {
		const existing = {
			name: 'demo-app',
			version: '0.1.0',
			type: 'module',
			private: true,
			scripts: {
				start: 'wpk start',
				build: 'wpk build',
				generate: 'wpk generate',
				apply: 'wpk apply',
			},
			dependencies: { ...dependencyResolution.dependencies },
			peerDependencies: { ...dependencyResolution.peerDependencies },
			devDependencies: { ...dependencyResolution.devDependencies },
		};
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn()
				.mockResolvedValue(`${JSON.stringify(existing)}\n`),
			write: jest.fn(),
		});

		const status = await writePackageJson(workspace, {
			namespace: 'demo-app',
			force: false,
			dependencyResolution,
		});

		expect(status).toBeNull();
		expect(workspace.write).not.toHaveBeenCalled();
	});

	it('forces updates for conflicting fields and scripts when requested', async () => {
		const writes: Array<{ path: string; data: string }> = [];
		const captureWrite: Workspace['write'] = jest.fn(async (file, data) => {
			writes.push({
				path: file,
				data: data.toString(),
			});
		});
		const workspace = makeWorkspaceMock({
			readText: jest.fn().mockResolvedValue(
				JSON.stringify({
					name: 'custom-name',
					version: '0.0.1',
					type: 'commonjs',
					private: false,
					scripts: {
						start: 'npm start',
					},
					dependencies: {
						'@wpkernel/core': '^0.5.0',
					},
					peerDependencies: {},
					devDependencies: {
						vite: '^6.0.0',
						'@types/react': '^18.0.0',
					},
				})
			),
			write: captureWrite,
		});

		const status = await writePackageJson(workspace, {
			namespace: 'demo-app',
			force: true,
			dependencyResolution: {
				...dependencyResolution,
				dependencies: {
					'@wpkernel/core': '^0.6.0',
					'demo-extra': '^1.0.0',
				},
				devDependencies: {
					...dependencyResolution.devDependencies,
					'@types/react': '^18.2.0',
				},
			},
		});

		expect(status).toBe('updated');
		expect(writes).toHaveLength(1);

		const parsed = JSON.parse(writes[0]?.data ?? '{}');
		expect(parsed).toMatchObject({
			name: 'demo-app',
			version: '0.1.0',
			type: 'module',
			private: true,
			scripts: {
				start: 'wpk start',
				build: 'wpk build',
				generate: 'wpk generate',
				apply: 'wpk apply',
			},
		});
		expect(parsed.dependencies).toEqual({
			'@wpkernel/core': '^0.6.0',
			'demo-extra': '^1.0.0',
		});
		expect(parsed.devDependencies).toEqual({
			'@types/react': '^18.2.0',
			typescript: '^5.9.3',
			vite: '^7.1.9',
		});
	});

	it('appends a package summary entry when provided a status', () => {
		const summaries: Array<{
			path: string;
			status: 'created' | 'updated';
		}> = [{ path: 'src/index.ts', status: 'created' }];

		appendPackageSummary({ summaries, packageStatus: 'updated' });

		expect(summaries).toContainEqual({
			path: 'package.json',
			status: 'updated',
		});
	});

	it('throws a kernel error when the existing package cannot be parsed', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest.fn().mockResolvedValue('not-json'),
		});

		await expect(
			writePackageJson(workspace, {
				namespace: 'demo-app',
				force: false,
				dependencyResolution,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});
});
