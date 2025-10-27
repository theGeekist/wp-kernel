import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import baseConfig from '../../jest.config.base.js';
import { parse as parseJsonWithComments } from 'jsonc-parser';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, '..', '..');
const tsconfigBasePath = path.join(repoRoot, 'tsconfig.base.json');

const tsconfigRaw = fs.readFileSync(tsconfigBasePath, 'utf8');
const parsedTsconfig = parseJsonWithComments(tsconfigRaw);
const tsconfigBase =
	parsedTsconfig && typeof parsedTsconfig === 'object' ? parsedTsconfig : {};
const tsPaths = tsconfigBase.compilerOptions?.paths ?? {};

function ensurePosix(value) {
	return value.split(path.sep).join('/');
}

function removeExtension(value) {
	return value.replace(/\.(tsx?|jsx?)$/, '');
}

function stripIndex(value) {
	return value.endsWith('/index') ? value.slice(0, -'/index'.length) : value;
}

function buildModuleNameMapper() {
	const mapper = { ...(baseConfig.moduleNameMapper ?? {}) };

	for (const [alias, targets] of Object.entries(tsPaths)) {
		if (!targets?.length) {
			continue;
		}

		const aliasPattern = alias.replace(/\*$/, '(.*)');
		const hasWildcard = alias.endsWith('*');
		const target = targets[0];
		const cleanedTarget = stripIndex(
			removeExtension(target.replace(/^\.\//, ''))
		);
		const normalizedTarget = ensurePosix(
			path.join('<rootDir>', cleanedTarget)
		);
		const normalizedTargetDir = hasWildcard
			? normalizedTarget.replace(/\/\*+$/, '')
			: normalizedTarget;

		const regex = hasWildcard ? `^${aliasPattern}$` : `^${alias}$`;
		mapper[regex] = hasWildcard
			? `${normalizedTargetDir}/$1`
			: normalizedTarget;

		if (hasWildcard && !alias.endsWith('**')) {
			mapper[`${regex.replace(/\(\.\*\)\$$/, '(.*)\\.js$')}`] =
				mapper[regex];
		}
	}

	return mapper;
}

function findRepoRoot(startDir) {
	let current = startDir;

	while (!fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
		const parent = path.dirname(current);

		if (parent === current) {
			throw new Error(
				'Unable to locate repository root from provided package directory.'
			);
		}

		current = parent;
	}

	return current;
}

function resolvePackageDir(input) {
	const raw = typeof input === 'string' ? input : fileURLToPath(input);
	const resolved = raw.startsWith('file://') ? fileURLToPath(raw) : raw;
	return fs.statSync(resolved).isDirectory()
		? resolved
		: path.dirname(resolved);
}

export function createWPKJestConfig(options) {
	const packageDirectory = resolvePackageDir(options.packageDir);
	const rootDir = findRepoRoot(packageDirectory);
	const relativePackageDir = ensurePosix(
		path.relative(rootDir, packageDirectory)
	);

	const defaultTestMatch = [
		`<rootDir>/${relativePackageDir}/**/__tests__/**/*.{ts,tsx}`,
		`<rootDir>/${relativePackageDir}/**/?(*.)+(spec|test).{ts,tsx}`,
	];

	const defaultCoverageGlobs = [
		`<rootDir>/${relativePackageDir}/src/**/*.{ts,tsx}`,
		`!<rootDir>/${relativePackageDir}/src/**/__tests__/**`,
		`!<rootDir>/${relativePackageDir}/src/**/*.d.ts`,
	];

	return {
		...baseConfig,
		displayName: options.displayName,
		rootDir,
		testMatch: options.testMatch ?? defaultTestMatch,
		moduleNameMapper: {
			...buildModuleNameMapper(),
			...(options.moduleNameMapper ?? {}),
		},
		setupFilesAfterEnv: options.setupFilesAfterEnv ?? [
			'<rootDir>/tests/setup-jest.ts',
		],
		collectCoverageFrom:
			options.collectCoverageFrom ?? defaultCoverageGlobs,
		coverageThreshold:
			options.coverageThreshold ?? baseConfig.coverageThreshold,
	};
}
