import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadKernelConfig } from '../load-kernel-config';
import { WPK_CONFIG_SOURCES } from '@geekist/wp-kernel/namespace/constants';

const TMP_PREFIX = 'wpk-cli-config-loader-';

describe('loadKernelConfig', () => {
	async function withWorkspace(
		files: Record<string, string>,
		run: (workspace: string) => Promise<void>
	) {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), TMP_PREFIX)
		);

		await Promise.all(
			Object.entries(files).map(async ([relativePath, contents]) => {
				const absolutePath = path.join(workspaceRoot, relativePath);
				await fs.mkdir(path.dirname(absolutePath), { recursive: true });
				await fs.writeFile(absolutePath, contents);
			})
		);

		const previousCwd = process.cwd();
		process.chdir(workspaceRoot);

		try {
			await run(workspaceRoot);
		} finally {
			process.chdir(previousCwd);
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	}

	it('loads a kernel config and validates composer autoload', async () => {
		await withWorkspace(
			{
				'kernel.config.js': `module.exports = {
  version: 1,
  namespace: 'valid-namespace',
  schemas: {},
  resources: {
    thing: {
      name: 'thing',
      identity: { type: 'number' },
      routes: {
        list: { path: '/valid/v1/things', method: 'GET' },
        get: { path: '/valid/v1/things/:id', method: 'GET' }
      }
    }
  }
};
`,
				'composer.json': createComposerJson('inc/'),
			},
			async (workspaceRoot) => {
				const result = await loadKernelConfig();

				expect(result.namespace).toBe('valid-namespace');
				expect(result.config.namespace).toBe('valid-namespace');
				expect(result.configOrigin).toBe(
					WPK_CONFIG_SOURCES.KERNEL_CONFIG_JS
				);
				expect(result.sourcePath).toBe(
					path.join(workspaceRoot, 'kernel.config.js')
				);
				expect(result.composerCheck).toBe('ok');
				expect(result.config.version).toBe(1);
			}
		);
	});

	it('throws when no kernel config is discovered', async () => {
		await withWorkspace(
			{
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'DeveloperError',
				});
			}
		);
	});

	it('throws a validation error when composer autoload mapping is incorrect', async () => {
		await withWorkspace(
			{
				'kernel.config.js': `module.exports = {
  version: 1,
  namespace: 'valid-namespace',
  schemas: {},
  resources: {
    thing: {
      name: 'thing',
      identity: { type: 'number' },
      routes: {
        list: { path: '/valid/v1/things', method: 'GET' },
        get: { path: '/valid/v1/things/:id', method: 'GET' }
      }
    }
  }
};
`,
				'composer.json': createComposerJson('src/'),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json is missing', async () => {
		await withWorkspace(
			{
				'kernel.config.js': createValidKernelConfig('valid-namespace'),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json cannot be parsed', async () => {
		await withWorkspace(
			{
				'kernel.config.js': createValidKernelConfig('valid-namespace'),
				'composer.json': '{ invalid json',
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json is missing autoload metadata', async () => {
		await withWorkspace(
			{
				'kernel.config.js': createValidKernelConfig('valid-namespace'),
				'composer.json': JSON.stringify(
					{ name: 'temp/plugin' },
					null,
					2
				),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json is missing psr-4 autoload mappings', async () => {
		await withWorkspace(
			{
				'kernel.config.js': createValidKernelConfig('valid-namespace'),
				'composer.json': JSON.stringify(
					{
						name: 'temp/plugin',
						autoload: {},
					},
					null,
					2
				),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json psr-4 mappings are not strings', async () => {
		await withWorkspace(
			{
				'kernel.config.js': createValidKernelConfig('valid-namespace'),
				'composer.json': JSON.stringify(
					{
						name: 'temp/plugin',
						autoload: {
							'psr-4': {
								'Temp\\\\Plugin\\\\': ['inc/'],
							},
						},
					},
					null,
					2
				),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when resource identity metadata does not match routes', async () => {
		await withWorkspace(
			{
				'kernel.config.js': `module.exports = {
  version: 1,
  namespace: 'valid-namespace',
  schemas: {},
  resources: {
    thing: {
      name: 'thing',
      identity: { type: 'string', param: 'slug' },
      routes: {
        list: { path: '/valid/v1/things', method: 'GET' },
        get: { path: '/valid/v1/things/:id', method: 'GET' }
      }
    }
  }
};
`,
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when a JavaScript config fails to import', async () => {
		await withWorkspace(
			{
				'kernel.config.js': `throw new Error('boom');`,
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				await expect(loadKernelConfig()).rejects.toMatchObject({
					code: 'DeveloperError',
				});
			}
		);
	});

	it('resolves nested config exports via promises and default properties', async () => {
		await withWorkspace(
			{
				'kernel.config.js': `module.exports = Promise.resolve({
  default: {
    kernelConfig: {
      config: ${createConfigObjectString('nested-namespace')}
    }
  }
});
`,
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				const result = await loadKernelConfig();
				expect(result.namespace).toBe('nested-namespace');
				expect(result.config.namespace).toBe('nested-namespace');
			}
		);
	});

	it('supports TypeScript configs via tsx fallback', async () => {
		await withWorkspace(
			{
				'kernel.config.ts': `export default Promise.resolve({
  default: {
    kernelConfig: {
      config: ${createConfigObjectString('ts namespace')}
    }
  }
});
`,
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				const tsImportMock = jest.fn().mockResolvedValue({
					default: {
						kernelConfig: {
							config: createConfigObject('ts namespace'),
						},
					},
				});

				jest.resetModules();
				await jest.isolateModulesAsync(async () => {
					jest.doMock('tsx/esm/api', () => ({
						tsImport: tsImportMock,
					}));
					const { loadKernelConfig: isolatedLoad } = await import(
						'../load-kernel-config'
					);

					const result = await isolatedLoad();

					expect(tsImportMock).toHaveBeenCalledTimes(1);
					expect(result.namespace).toBe('ts-namespace');
					expect(result.config.namespace).toBe('ts-namespace');
					expect(result.configOrigin).toBe(
						WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS
					);
				});
				jest.resetModules();
			}
		);
	});

	it('wraps tsx loader failures with KernelError', async () => {
		await withWorkspace(
			{
				'kernel.config.ts': `export default {};
`,
			},
			async () => {
				const failure = new Error('tsx exploded');
				const tsImportMock = jest.fn().mockRejectedValue(failure);

				jest.resetModules();
				await jest.isolateModulesAsync(async () => {
					jest.doMock('tsx/esm/api', () => ({
						tsImport: tsImportMock,
					}));
					const { loadKernelConfig: isolatedLoad } = await import(
						'../load-kernel-config'
					);

					await expect(isolatedLoad()).rejects.toMatchObject({
						code: 'DeveloperError',
					});
					expect(tsImportMock).toHaveBeenCalled();
				});
				jest.resetModules();
			}
		);
	});

	it('supports loading config from package.json#wpk', async () => {
		const packageJson = {
			name: 'temp-plugin',
			wpk: {
				version: 1,
				namespace: 'package-namespace',
				schemas: {},
				resources: {
					thing: {
						name: 'thing',
						identity: { type: 'number' },
						routes: {
							list: {
								path: '/pkg/v1/things',
								method: 'GET',
							},
							get: {
								path: '/pkg/v1/things/:id',
								method: 'GET',
							},
						},
					},
				},
			},
		} satisfies Record<string, unknown>;

		await withWorkspace(
			{
				'package.json': JSON.stringify(packageJson, null, 2),
				'composer.json': createComposerJson('inc/'),
			},
			async (workspaceRoot) => {
				const result = await loadKernelConfig();

				expect(result.namespace).toBe('package-namespace');
				expect(result.configOrigin).toBe(
					WPK_CONFIG_SOURCES.PACKAGE_JSON_WPK
				);
				expect(result.sourcePath).toBe(
					path.join(workspaceRoot, 'package.json')
				);
			}
		);
	});
});

function createComposerJson(autoloadPath: string): string {
	return JSON.stringify(
		{
			name: 'temp/plugin',
			autoload: {
				'psr-4': {
					'Temp\\\\Plugin\\\\': autoloadPath,
				},
			},
		},
		null,
		2
	);
}

function createValidKernelConfig(namespace: string): string {
	return `module.exports = ${createConfigObjectString(namespace)};\n`;
}

function createConfigObjectString(namespace: string): string {
	return JSON.stringify(createConfigObject(namespace), null, 2);
}

function createConfigObject(namespace: string) {
	return {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			thing: {
				name: 'thing',
				identity: { type: 'number' },
				routes: {
					list: {
						path: `/${namespace}/v1/things`,
						method: 'GET',
					},
					get: {
						path: `/${namespace}/v1/things/:id`,
						method: 'GET',
					},
				},
			},
		},
	};
}
