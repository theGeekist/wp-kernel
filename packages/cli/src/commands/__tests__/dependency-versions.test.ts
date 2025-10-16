import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveDependencyVersions } from '../init/dependency-versions';
import { getCliPackageRoot } from '../init/module-url';
import { createWorkspaceRunner } from '../../../tests/workspace.test-support';

const withWorkspace = createWorkspaceRunner({
	prefix: path.join(os.tmpdir(), 'wpk-init-deps-'),
	chdir: false,
});

describe('resolveDependencyVersions', () => {
	afterEach(() => {
		delete (globalThis as { __WPK_CLI_MODULE_URL__?: string })
			.__WPK_CLI_MODULE_URL__;
	});

	it('falls back to bundled defaults when no peer sources are available', async () => {
		await withWorkspace(async (workspace) => {
			const manifestPath = path.join(
				getCliPackageRoot(),
				'dist',
				'cli',
				'versions.json'
			);
			await fs.rm(manifestPath, { force: true });

			const versions = await resolveDependencyVersions(workspace);

			expect(versions.source).toBe('fallback');
			expect(versions.dependencies).toMatchObject({
				'@wpkernel/core': 'latest',
				'@wpkernel/ui': 'latest',
			});
			expect(versions.peerDependencies.react).toBeDefined();
			expect(versions.devDependencies.typescript).toBeDefined();
		});
	});

	it('reads peer versions from a workspace-installed @wpkernel/core', async () => {
		await withWorkspace(async (workspace) => {
			const corePackagePath = path.join(
				workspace,
				'node_modules',
				'@wpkernel',
				'core'
			);
			await fs.mkdir(corePackagePath, { recursive: true });
			await fs.writeFile(
				path.join(corePackagePath, 'package.json'),
				JSON.stringify(
					{
						name: '@wpkernel/core',
						version: '0.0.0-test',
						peerDependencies: {
							'@wordpress/data': 'workspace-version',
						},
					},
					null,
					2
				)
			);

			const versions = await resolveDependencyVersions(workspace);
			expect(versions.peerDependencies['@wordpress/data']).toBe(
				'workspace-version'
			);
			expect(versions.source).toBe('workspace-core');
		});
	});

	it('merges bundled manifest peers when present', async () => {
		await withWorkspace(async (workspace) => {
			const cliRoot = getCliPackageRoot();
			const manifestPath = path.join(
				cliRoot,
				'dist',
				'cli',
				'versions.json'
			);

			await fs.mkdir(path.dirname(manifestPath), { recursive: true });
			await fs.writeFile(
				manifestPath,
				JSON.stringify(
					{
						coreVersion: '0.0.0-test',
						generatedAt: new Date().toISOString(),
						peers: {
							'@wordpress/hooks': 'manifest-version',
						},
					},
					null,
					2
				)
			);

			try {
				const versions = await resolveDependencyVersions(workspace);
				expect(versions.peerDependencies['@wordpress/hooks']).toBe(
					'manifest-version'
				);
				expect(versions.source).toBe('bundled-manifest');
			} finally {
				await fs.rm(manifestPath, { force: true });
			}
		});
	});

	it('uses module handshake when provided', async () => {
		await withWorkspace(async (workspace) => {
			const moduleUrl = pathToFileURL(
				path.join(process.cwd(), 'packages/cli/dist/commands/init.js')
			).href;

			(
				globalThis as { __WPK_CLI_MODULE_URL__?: string }
			).__WPK_CLI_MODULE_URL__ = moduleUrl;

			const versions = await resolveDependencyVersions(workspace);
			expect(versions.peerDependencies.react).toBeDefined();
		});
	});

	it('loads registry peers when preferred and available', async () => {
		await withWorkspace(async (workspace) => {
			const fetchMock = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					'dist-tags': { latest: '1.0.0' },
					versions: {
						'1.0.0': {
							peerDependencies: {
								react: '^18.0.0',
								'@wordpress/data': 'registry-version',
							},
						},
					},
				}),
			});

			const versions = await resolveDependencyVersions(workspace, {
				preferRegistryVersions: true,
				fetch: fetchMock,
				registryUrl: 'https://registry.example.com',
			});

			expect(fetchMock).toHaveBeenCalled();
			expect(versions.peerDependencies['@wordpress/data']).toBe(
				'registry-version'
			);
			expect(versions.source).toBe('registry');
		});
	});

	it('ignores registry when workspace peers are available', async () => {
		await withWorkspace(async (workspace) => {
			const fetchMock = jest.fn();
			const corePackagePath = path.join(
				workspace,
				'node_modules',
				'@wpkernel',
				'core'
			);
			await fs.mkdir(corePackagePath, { recursive: true });
			await fs.writeFile(
				path.join(corePackagePath, 'package.json'),
				JSON.stringify(
					{
						name: '@wpkernel/core',
						version: '0.0.0-test',
						peerDependencies: {
							'@wordpress/components': 'workspace-version',
						},
					},
					null,
					2
				)
			);

			const versions = await resolveDependencyVersions(workspace, {
				preferRegistryVersions: true,
				fetch: fetchMock,
			});

			expect(fetchMock).not.toHaveBeenCalled();
			expect(versions.peerDependencies['@wordpress/components']).toBe(
				'workspace-version'
			);
			expect(versions.source).toBe('workspace-core');
		});
	});

	it('adds kernel dev dependencies when present in workspace', async () => {
		await withWorkspace(async (workspace) => {
			const cliPath = path.join(
				workspace,
				'node_modules',
				'@wpkernel',
				'cli'
			);
			const e2ePath = path.join(
				workspace,
				'node_modules',
				'@wpkernel',
				'e2e-utils'
			);

			await fs.mkdir(cliPath, { recursive: true });
			await fs.mkdir(e2ePath, { recursive: true });

			await fs.writeFile(
				path.join(cliPath, 'package.json'),
				JSON.stringify(
					{
						name: '@wpkernel/cli',
						version: '1.2.3',
					},
					null,
					2
				)
			);

			await fs.writeFile(
				path.join(e2ePath, 'package.json'),
				JSON.stringify(
					{
						name: '@wpkernel/e2e-utils',
						version: '4.5.6',
					},
					null,
					2
				)
			);

			const versions = await resolveDependencyVersions(workspace);

			expect(versions.devDependencies['@wpkernel/cli']).toBe('1.2.3');
			expect(versions.devDependencies['@wpkernel/e2e-utils']).toBe(
				'4.5.6'
			);
		});
	});
});
