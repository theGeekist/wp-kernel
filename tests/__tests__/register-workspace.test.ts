import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
	createWorkspace,
	removeWorkspace,
	updateWorkspace,
} from '@wpkernel/scripts/register-workspace';

type LoggerMock = {
	readonly log: jest.Mock<void, [string]>;
	readonly warn: jest.Mock<void, [string]>;
};

function createLogger(): LoggerMock {
	return {
		log: jest.fn(),
		warn: jest.fn(),
	};
}

function writeJson(targetPath: string, contents: unknown): void {
	fs.mkdirSync(path.dirname(targetPath), { recursive: true });
	fs.writeFileSync(
		targetPath,
		`${JSON.stringify(contents, null, '\t')}\n`,
		'utf8'
	);
}

function setupRepository(): { rootDir: string; cleanup: () => void } {
	const rootDir = fs.mkdtempSync(
		path.join(os.tmpdir(), 'wpk-register-workspace-')
	);

	writeJson(path.join(rootDir, 'package.json'), {
		name: 'wpk-root-fixture',
		version: '1.2.3',
	});
	writeJson(path.join(rootDir, 'pnpm-workspace.yaml'), {
		packages: ['packages/*'],
	});
	writeJson(path.join(rootDir, 'tsconfig.base.json'), {
		compilerOptions: {},
	});
	writeJson(path.join(rootDir, 'tsconfig.json'), {
		$schema: 'https://json.schemastore.org/tsconfig',
		extends: './tsconfig.base.json',
		references: [],
	});

	fs.mkdirSync(path.join(rootDir, 'types'), { recursive: true });
	fs.mkdirSync(path.join(rootDir, 'tests'), { recursive: true });
	fs.mkdirSync(path.join(rootDir, 'packages/test-utils/src'), {
		recursive: true,
	});

	return {
		rootDir,
		cleanup: () => {
			fs.rmSync(rootDir, { recursive: true, force: true });
		},
	};
}

function createPackage(rootDir: string, packageName: string): string {
	const packageDir = path.join(rootDir, 'packages', packageName);
	fs.mkdirSync(path.join(packageDir, 'src'), { recursive: true });
	writeJson(path.join(packageDir, 'package.json'), {
		name: `@wpkernel/${packageName}`,
	});
	return packageDir;
}

describe('register-workspace', () => {
	it('creates a new workspace with scaffolded files', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			createWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});

			const packageDir = path.join(rootDir, 'packages/alpha');
			const manifest = JSON.parse(
				fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')
			) as { scripts?: Record<string, string>; version?: string };

			expect(manifest.version).toBe('1.2.3');
			expect(manifest.scripts).toMatchObject({
				build: 'vite build && tsc --project tsconfig.json',
				clean: 'rm -rf dist dist-tests *.tsbuildinfo',
				lint: 'eslint src/',
				'lint:fix': 'eslint src/ --fix',
				test: 'wpk-run-jest',
				'test:coverage': 'wpk-run-jest coverage',
				'test:integration': 'wpk-run-jest integration',
				'test:watch': 'wpk-run-jest --watch',
				typecheck: 'tsc --project tsconfig.json --noEmit',
				'typecheck:tests': 'wpk-run-typecheck-tests',
			});

			expect(fs.existsSync(path.join(packageDir, 'src/index.ts'))).toBe(
				true
			);
			expect(
				fs.existsSync(path.join(packageDir, 'tests/index.test.ts'))
			).toBe(true);
			expect(
				fs.existsSync(
					path.join(packageDir, 'tests/index.integration.test.ts')
				)
			).toBe(true);
		} finally {
			cleanup();
		}
	});

	it('ensures package manifests expose default scripts', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			const alphaDir = createPackage(rootDir, 'alpha');

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});

			const manifest = JSON.parse(
				fs.readFileSync(path.join(alphaDir, 'package.json'), 'utf8')
			) as { scripts?: Record<string, string> };

			expect(manifest.scripts).toMatchObject({
				build: 'vite build && tsc --project tsconfig.json',
				clean: 'rm -rf dist dist-tests *.tsbuildinfo',
				lint: 'eslint src/',
				'lint:fix': 'eslint src/ --fix',
				test: 'wpk-run-jest',
				'test:coverage': 'wpk-run-jest coverage',
				'test:integration': 'wpk-run-jest integration',
				'test:watch': 'wpk-run-jest --watch',
				typecheck: 'tsc --project tsconfig.json --noEmit',
				'typecheck:tests': 'wpk-run-typecheck-tests',
			});
		} finally {
			cleanup();
		}
	});

	it('adds TypeScript references for declared dependencies', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			createPackage(rootDir, 'alpha');
			createPackage(rootDir, 'beta');

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});
			updateWorkspace({
				workspaceInput: 'packages/beta',
				cwd: rootDir,
				logger,
			});

			logger.log.mockClear();

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToAdd: ['beta'],
				logger,
			});

			const alphaTsconfig = JSON.parse(
				fs.readFileSync(
					path.join(rootDir, 'packages/alpha/tsconfig.json'),
					'utf8'
				)
			) as { references?: Array<{ path: string }> };
			const alphaTestsTsconfig = JSON.parse(
				fs.readFileSync(
					path.join(rootDir, 'packages/alpha/tsconfig.tests.json'),
					'utf8'
				)
			) as { references?: Array<{ path: string }> };

			expect(alphaTsconfig.references).toEqual([{ path: '../beta' }]);
			expect(alphaTestsTsconfig.references).toEqual([
				{ path: '../beta' },
			]);

			const baseTsconfig = JSON.parse(
				fs.readFileSync(
					path.join(rootDir, 'tsconfig.base.json'),
					'utf8'
				)
			) as {
				compilerOptions?: {
					paths?: Record<string, readonly string[]>;
				};
			};

			expect(
				baseTsconfig.compilerOptions?.paths?.['@wpkernel/alpha']
			).toEqual(['./packages/alpha/src/index.ts']);
			expect(
				baseTsconfig.compilerOptions?.paths?.['@wpkernel/alpha/*']
			).toEqual(['./packages/alpha/src/*']);
		} finally {
			cleanup();
		}
	});

	it('removes references when dependencies are removed', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			createPackage(rootDir, 'alpha');
			createPackage(rootDir, 'beta');

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});
			updateWorkspace({
				workspaceInput: 'packages/beta',
				cwd: rootDir,
				logger,
			});

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToAdd: ['beta'],
				logger,
			});

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToRemove: ['beta'],
				logger,
			});

			const alphaTsconfig = JSON.parse(
				fs.readFileSync(
					path.join(rootDir, 'packages/alpha/tsconfig.json'),
					'utf8'
				)
			) as { references?: Array<{ path: string }> };

			expect(alphaTsconfig.references).toEqual([]);
		} finally {
			cleanup();
		}
	});

	it('updates peerDependencies when declaring internal dependencies', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			const alphaDir = createPackage(rootDir, 'alpha');
			createPackage(rootDir, 'beta');

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});
			updateWorkspace({
				workspaceInput: 'packages/beta',
				cwd: rootDir,
				logger,
			});

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToAdd: ['beta'],
				logger,
			});

			const manifest = JSON.parse(
				fs.readFileSync(path.join(alphaDir, 'package.json'), 'utf8')
			) as {
				peerDependencies?: Record<string, string>;
			};

			expect(manifest.peerDependencies).toEqual({
				'@wpkernel/beta': 'workspace:*',
			});
		} finally {
			cleanup();
		}
	});

	it('removes peerDependencies when dependencies are removed', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			const alphaDir = createPackage(rootDir, 'alpha');
			createPackage(rootDir, 'beta');

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});
			updateWorkspace({
				workspaceInput: 'packages/beta',
				cwd: rootDir,
				logger,
			});

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToAdd: ['beta'],
				logger,
			});

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToRemove: ['beta'],
				logger,
			});

			const manifest = JSON.parse(
				fs.readFileSync(path.join(alphaDir, 'package.json'), 'utf8')
			) as {
				peerDependencies?: Record<string, string>;
			};

			expect(manifest.peerDependencies).toEqual({});
		} finally {
			cleanup();
		}
	});

	it('warns when introducing a cyclic dependency', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			createPackage(rootDir, 'alpha');
			const betaDir = createPackage(rootDir, 'beta');

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});
			updateWorkspace({
				workspaceInput: 'packages/beta',
				cwd: rootDir,
				logger,
			});

			writeJson(path.join(betaDir, 'tsconfig.json'), {
				$schema: 'https://json.schemastore.org/tsconfig',
				extends: '../../tsconfig.lib.json',
				references: [{ path: '../alpha' }],
			});

			logger.warn.mockClear();

			updateWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				dependenciesToAdd: ['beta'],
				logger,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Potential cyclic dependency')
			);
		} finally {
			cleanup();
		}
	});

	it('removes workspace artifacts and references', () => {
		const { rootDir, cleanup } = setupRepository();
		const logger = createLogger();

		try {
			createWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});

			const packageDir = path.join(rootDir, 'packages/alpha');
			expect(fs.existsSync(packageDir)).toBe(true);

			removeWorkspace({
				workspaceInput: 'packages/alpha',
				cwd: rootDir,
				logger,
			});

			expect(fs.existsSync(packageDir)).toBe(false);

			const rootTsconfig = JSON.parse(
				fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')
			) as { references?: Array<{ path: string }> };

			expect(
				rootTsconfig.references?.some((ref) =>
					ref.path.includes('packages/alpha')
				)
			).toBe(false);
		} finally {
			cleanup();
		}
	});
});
