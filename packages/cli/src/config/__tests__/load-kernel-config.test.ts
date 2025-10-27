import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	loadWPKernelConfig,
	getConfigOrigin,
	resolveConfigValue,
	formatError,
	createTsLoader,
	createJsLoader,
	findUp,
	fileExists,
	getTsImport,
	setCachedTsImport,
} from '../load-kernel-config';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import { createWorkspaceRunner } from '../../../tests/workspace.test-support';

const TMP_PREFIX = 'wpk-cli-config-loader-';

const runWorkspace = createWorkspaceRunner({
	prefix: path.join(os.tmpdir(), TMP_PREFIX),
});

describe('loadWPKernelConfig', () => {
	async function withWorkspace(
		files: Record<string, string>,
		run: (workspace: string) => Promise<void>
	) {
		await runWorkspace(run, { files });
	}

	it('loads a kernel config and validates composer autoload', async () => {
		await withWorkspace(
			{
				'wpk.config.js': `module.exports = {
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
				const result = await loadWPKernelConfig();

				expect(result.namespace).toBe('valid-namespace');
				expect(result.config.namespace).toBe('valid-namespace');
				expect(result.configOrigin).toBe(
					WPK_CONFIG_SOURCES.WPK_CONFIG_JS
				);
				// macOS may return tmpdir paths with a "/private" prefix;
				// canonicalize both sides using realpathSync for stable equality.
				expect(fsSync.realpathSync(result.sourcePath)).toBe(
					fsSync.realpathSync(
						path.join(workspaceRoot, 'wpk.config.js')
					)
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
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'DeveloperError',
				});
			}
		);
	});

	it('throws a validation error when composer autoload mapping is incorrect', async () => {
		await withWorkspace(
			{
				'wpk.config.js': `module.exports = {
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
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json is missing', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
			},
			async () => {
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json cannot be parsed', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
				'composer.json': '{ invalid json',
			},
			async () => {
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('wraps composer read failures with WPKernelError for primitive reasons', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				const originalReadFile = fs.readFile;
				const readSpy = jest
					.spyOn(fs, 'readFile')
					.mockImplementation(async (...args) => {
						const [pathLike] = args;
						if (
							typeof pathLike === 'string' &&
							pathLike.endsWith('composer.json')
						) {
							throw new Error('read-failure');
						}

						return originalReadFile(
							...(args as Parameters<typeof fs.readFile>)
						);
					});

				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});

				expect(readSpy).toHaveBeenCalled();
				readSpy.mockRestore();
			}
		);
	});

	it('throws when composer.json is missing autoload metadata', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
				'composer.json': JSON.stringify(
					{ name: 'temp/plugin' },
					null,
					2
				),
			},
			async () => {
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('accepts composer mappings without trailing slash', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
				'composer.json': JSON.stringify(
					{
						name: 'temp/plugin',
						autoload: {
							'psr-4': {
								'Temp\\\\Plugin\\\\': 'inc',
							},
						},
					},
					null,
					2
				),
			},
			async () => {
				const result = await loadWPKernelConfig();
				expect(result.namespace).toBe('valid-namespace');
			}
		);
	});

	it('throws when composer.json is missing psr-4 autoload mappings', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
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
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when composer.json psr-4 mappings are not strings', async () => {
		await withWorkspace(
			{
				'wpk.config.js': createValidWPKernelConfig('valid-namespace'),
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
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when resource identity metadata does not match routes', async () => {
		await withWorkspace(
			{
				'wpk.config.js': `module.exports = {
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
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'ValidationError',
				});
			}
		);
	});

	it('throws when a JavaScript config fails to import', async () => {
		await withWorkspace(
			{
				'wpk.config.js': `throw new Error('boom');`,
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				await expect(loadWPKernelConfig()).rejects.toMatchObject({
					code: 'DeveloperError',
				});
			}
		);
	});

	it('resolves nested config exports via promises and default properties', async () => {
		await withWorkspace(
			{
				'wpk.config.js': `module.exports = Promise.resolve({
  default: {
    wpkConfig: {
      config: ${createConfigObjectString('nested-namespace')}
    }
  }
});
`,
				'composer.json': createComposerJson('inc/'),
			},
			async () => {
				const result = await loadWPKernelConfig();
				expect(result.namespace).toBe('nested-namespace');
				expect(result.config.namespace).toBe('nested-namespace');
			}
		);
	});

	it('supports TypeScript configs via tsx fallback', async () => {
		await withWorkspace(
			{
				'wpk.config.ts': `export default Promise.resolve({
  default: {
    wpkConfig: {
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
						wpkConfig: {
							config: createConfigObject('ts namespace'),
						},
					},
				});

				jest.resetModules();
				await jest.isolateModulesAsync(async () => {
					jest.doMock('tsx/esm/api', () => ({
						tsImport: tsImportMock,
					}));
					const { loadWPKernelConfig: isolatedLoad } = await import(
						'../load-kernel-config'
					);

					const result = await isolatedLoad();

					expect(tsImportMock).toHaveBeenCalledTimes(1);
					expect(result.namespace).toBe('ts-namespace');
					expect(result.config.namespace).toBe('ts-namespace');
					expect(result.configOrigin).toBe(
						WPK_CONFIG_SOURCES.WPK_CONFIG_TS
					);
				});
				jest.resetModules();
			}
		);
	});

	it('wraps tsx loader failures with WPKernelError', async () => {
		await withWorkspace(
			{
				'wpk.config.ts': `export default {};
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
					const { loadWPKernelConfig: isolatedLoad } = await import(
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
				const result = await loadWPKernelConfig();

				expect(result.namespace).toBe('package-namespace');
				expect(result.configOrigin).toBe(
					WPK_CONFIG_SOURCES.PACKAGE_JSON_WPK
				);
				expect(fsSync.realpathSync(result.sourcePath)).toBe(
					fsSync.realpathSync(
						path.join(workspaceRoot, 'package.json')
					)
				);
			}
		);
	});
});

describe('loadWPKernelConfig helpers', () => {
	it('throws for unsupported config origins', () => {
		const result = {
			filepath: '/workspace/wpk.config.json',
			config: {},
		} as unknown as Parameters<typeof getConfigOrigin>[0];

		expect(() => getConfigOrigin(result)).toThrow(WPKernelError);
	});

	it('resolves config value across promises and wrappers', async () => {
		const config = await resolveConfigValue(
			Promise.resolve({
				default: {
					wpkConfig: {
						config: { version: 1 },
					},
				},
			})
		);

		expect(config).toEqual({ version: 1 });
	});

	it('stringifies unknown errors in formatError', () => {
		expect(formatError(42)).toBe('42');
	});

	it('falls back to tsImport when default loader fails', async () => {
		const defaultLoader = jest
			.fn()
			.mockRejectedValue(new Error('default failed'));
		const tsImport = jest.fn().mockResolvedValue({
			default: {
				wpkConfig: {
					config: { version: 1 },
				},
			},
		});

		const loader = createTsLoader({
			defaultLoader,
			tsImportLoader: async () => tsImport,
		});

		const result = await loader('/tmp/wpk.config.ts', '');

		expect(defaultLoader).toHaveBeenCalled();
		expect(tsImport).toHaveBeenCalled();
		expect(result).toEqual({ version: 1 });
	});

	it('wraps dynamic import failures in createJsLoader', async () => {
		const loader = createJsLoader(async () => {
			throw new Error('dynamic import boom');
		});

		await expect(loader('/tmp/wpk.config.js')).rejects.toMatchObject({
			code: 'DeveloperError',
		});
	});

	it('searches upwards for files until the filesystem root', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), TMP_PREFIX)
		);
		try {
			await fs.writeFile(
				path.join(workspaceRoot, 'composer.json'),
				createComposerJson('inc/'),
				'utf8'
			);
			const nested = path.join(workspaceRoot, 'nested', 'dir');
			await fs.mkdir(nested, { recursive: true });

			const found = await findUp(nested, 'composer.json');
			expect(found && path.basename(found)).toBe('composer.json');

			const missing = await findUp(nested, 'nonexistent.json');
			expect(missing).toBeNull();
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('checks for file existence using fs access semantics', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), TMP_PREFIX)
		);
		try {
			const filePath = path.join(workspaceRoot, 'test.txt');
			await fs.writeFile(filePath, 'hello', 'utf8');

			await expect(fileExists(filePath)).resolves.toBe(true);
			await expect(
				fileExists(path.join(workspaceRoot, 'missing.txt'))
			).resolves.toBe(false);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('reuses cached tsImport loaders when preset', async () => {
		const cached = Promise.resolve(jest.fn());
		setCachedTsImport(cached);

		const loader = await getTsImport();
		const resolved = await cached;
		expect(loader).toBe(resolved);

		setCachedTsImport(null);
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

function createValidWPKernelConfig(namespace: string): string {
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
