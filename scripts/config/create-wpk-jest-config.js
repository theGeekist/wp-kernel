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

function addDistOverrides(entries) {
	// For Jest, prefer source for core/pipeline/php-json-ast/ui/wp-json-ast dist imports
	// to avoid ESM moduleGraph issues inside ts-jest.
	entries.push([
		'^@wpkernel/(core|pipeline|php-json-ast|ui|wp-json-ast)/dist/(.*?)(?:\\.js)?$',
		'<rootDir>/packages/$1/src/$2',
	]);
	// Prefer built artifacts when tests import dist paths directly (other packages).
	entries.push([
		'^@wpkernel/([^/]+)/dist/(.*)$',
		'<rootDir>/packages/$1/dist/$2',
	]);
}

function addBaseMapper(entries) {
	for (const [key, value] of Object.entries(
		baseConfig.moduleNameMapper ?? {}
	)) {
		entries.push([key, value]);
	}
}

function addTsPathEntries(entries) {
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
		const mapped = hasWildcard
			? `${normalizedTargetDir}/$1`
			: normalizedTarget;

		entries.push([regex, mapped]);

		if (hasWildcard && !alias.endsWith('**')) {
			entries.push([regex.replace(/\(\.\*\)\$$/, '(.*)\\.js$'), mapped]);
		}
	}
}

function buildModuleNameMapper() {
	const entries = [];
	addDistOverrides(entries);
	addBaseMapper(entries);
	addTsPathEntries(entries);
	return Object.fromEntries(entries);
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
	const skipIntegration = process.env.JEST_SKIP_INTEGRATION === '1';
	const integrationTestPattern = '\\.integration\\.test\\.(?:[jt]sx?)$';

	const defaultTestMatch = [
		`<rootDir>/${relativePackageDir}/**/__tests__/**/*.{ts,tsx}`,
		`<rootDir>/${relativePackageDir}/**/?(*.)+(spec|test).{ts,tsx}`,
	];

	const defaultCoverageGlobs = [
		`<rootDir>/${relativePackageDir}/src/**/*.{ts,tsx}`,
		`!<rootDir>/${relativePackageDir}/src/**/__tests__/**`,
		`!<rootDir>/${relativePackageDir}/src/**/*.d.ts`,
	];

	const config = {
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

	const ignorePatterns = new Set(config.testPathIgnorePatterns ?? []);

	if (skipIntegration) {
		ignorePatterns.add(integrationTestPattern);
	}

	if (ignorePatterns.size > 0) {
		config.testPathIgnorePatterns = Array.from(ignorePatterns);
	}

	return config;
}
