#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { applyEdits, modify, parse } from 'jsonc-parser';
import type { FormattingOptions } from 'jsonc-parser';

type Logger = {
	log: (message: string) => void;
	warn: (message: string) => void;
};

interface RegisterWorkspaceOptions {
	readonly workspaceInput: string;
	readonly dependenciesToAdd?: readonly string[];
	readonly dependenciesToRemove?: readonly string[];
	readonly cwd?: string;
	readonly logger?: Logger;
}

interface CliArguments {
	readonly workspaceInput: string | null;
	readonly dependenciesToAdd: readonly string[];
	readonly dependenciesToRemove: readonly string[];
}

function ensurePosix(value: string): string {
	return value.split(path.sep).join('/');
}

function findRepoRoot(startDir: string): string {
	let current = startDir;

	while (!fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
		const parent = path.dirname(current);

		if (parent === current) {
			throw new Error(
				'Unable to locate repository root. Run this script from within the repository.'
			);
		}

		current = parent;
	}

	return current;
}

function resolveWorkspaceDir(
	input: string,
	repoRoot: string,
	cwd: string
): string {
	const cwdCandidate = path.resolve(cwd, input);
	if (fs.existsSync(cwdCandidate)) {
		return cwdCandidate;
	}

	const packageName = input.startsWith('@')
		? (input.split('/').pop() ?? input)
		: input;
	const workspacePath = path.join(repoRoot, 'packages', packageName);
	if (fs.existsSync(workspacePath)) {
		return workspacePath;
	}

	throw new Error(`Unable to resolve workspace directory for "${input}".`);
}

function relativeFromPackage(packageDir: string, target: string): string {
	const relativePath = ensurePosix(path.relative(packageDir, target));
	if (!relativePath || relativePath === '.') {
		return '.';
	}

	return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function joinRelativeDirectory(base: string, suffix: string): string {
	if (base === '.') {
		return suffix.startsWith('./') ? suffix : `./${suffix}`;
	}

	const normalized = base.endsWith('/') ? base : `${base}/`;
	return `${normalized}${suffix}`;
}

function writeJsonFile(filePath: string, contents: unknown): void {
	const formatted = `${JSON.stringify(contents, null, '\t')}\n`;
	fs.writeFileSync(filePath, formatted, 'utf8');
}

function readJsonFile<T>(filePath: string): T | null {
	if (!fs.existsSync(filePath)) {
		return null;
	}

	return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function relativeFromRoot(repoRoot: string, target: string): string {
	const relativePath = ensurePosix(path.relative(repoRoot, target));
	if (!relativePath || relativePath === '.') {
		return '.';
	}

	return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

const jsonFormattingOptions: FormattingOptions = {
	insertSpaces: false,
	tabSize: 4,
	eol: '\n',
};

function arraysEqual<T>(
	left: readonly T[] | undefined,
	right: readonly T[]
): boolean {
	if (!left || left.length !== right.length) {
		return false;
	}

	return left.every((value, index) => value === right[index]);
}

function ensureTsconfigBasePaths(
	packageDir: string,
	repoRoot: string,
	packageName: string,
	logger: Logger
): void {
	const baseConfigPath = path.join(repoRoot, 'tsconfig.base.json');
	if (!fs.existsSync(baseConfigPath)) {
		logger.warn(
			`Unable to update tsconfig.base.json because it does not exist at ${baseConfigPath}.`
		);
		return;
	}

	let content = fs.readFileSync(baseConfigPath, 'utf8');
	let parsed = parse(content) as {
		compilerOptions?: {
			paths?: Record<string, readonly string[]>;
		};
	};

	if (!parsed || typeof parsed !== 'object') {
		logger.warn(
			`Unable to parse tsconfig.base.json when updating paths for ${packageName}.`
		);
		return;
	}

	if (!parsed.compilerOptions) {
		const edits = modify(
			content,
			['compilerOptions'],
			{},
			{
				formattingOptions: jsonFormattingOptions,
			}
		);
		content = applyEdits(content, edits);
		parsed = parse(content) as typeof parsed;
	}

	if (!parsed.compilerOptions?.paths) {
		const edits = modify(
			content,
			['compilerOptions', 'paths'],
			{},
			{
				formattingOptions: jsonFormattingOptions,
			}
		);
		content = applyEdits(content, edits);
		parsed = parse(content) as typeof parsed;
	}

	const desiredEntry = [
		relativeFromRoot(repoRoot, path.join(packageDir, 'src/index.ts')),
	];
	const desiredWildcardEntry = [
		relativeFromRoot(repoRoot, path.join(packageDir, 'src/*')),
	];

	let changed = false;

	const ensureEntry = (key: string, desired: readonly string[]): void => {
		const current = parsed.compilerOptions?.paths?.[key];
		if (arraysEqual(current, desired)) {
			return;
		}

		const edits = modify(
			content,
			['compilerOptions', 'paths', key],
			desired,
			{ formattingOptions: jsonFormattingOptions }
		);
		content = applyEdits(content, edits);
		parsed = parse(content) as typeof parsed;
		changed = true;
	};

	ensureEntry(packageName, desiredEntry);
	ensureEntry(`${packageName}/*`, desiredWildcardEntry);

	if (changed) {
		fs.writeFileSync(baseConfigPath, content, 'utf8');
	}
}

function resolveDependencyDirectories(
	dependencies: readonly string[],
	packageDir: string,
	repoRoot: string,
	cwd: string,
	logger: Logger,
	{ skipSelf }: { skipSelf: boolean }
): readonly string[] {
	if (dependencies.length === 0) {
		return [];
	}

	const directories = new Map<string, string>();

	for (const dependency of dependencies) {
		const resolvedDir = resolveWorkspaceDir(dependency, repoRoot, cwd);
		if (
			skipSelf &&
			path.resolve(resolvedDir) === path.resolve(packageDir)
		) {
			logger.warn(`Skipping self dependency "${dependency}".`);
			continue;
		}

		directories.set(path.resolve(resolvedDir), resolvedDir);
	}

	return Array.from(directories.values());
}

function collectDependencyNames(
	dependencyDirs: readonly string[],
	logger: Logger,
	action: 'add' | 'remove'
): Set<string> {
	const names = new Set<string>();

	for (const dependencyDir of dependencyDirs) {
		const manifestPath = path.join(dependencyDir, 'package.json');
		const manifest = readJsonFile<{ name?: string }>(manifestPath);

		if (!manifest?.name) {
			logger.warn(
				`Skipping dependency metadata update for ${dependencyDir} while attempting to ${action} dependencies because package.json is missing a "name" field.`
			);
			continue;
		}

		names.add(manifest.name);
	}

	return names;
}

type PackageManifest = {
	name?: string;
	scripts?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	[key: string]: unknown;
};

function ensureManifestScripts(manifest: PackageManifest): boolean {
	let changed = false;
	manifest.scripts = manifest.scripts ?? {};

	if (!manifest.scripts.typecheck) {
		manifest.scripts.typecheck = 'tsc --noEmit';
		changed = true;
	}

	if (!manifest.scripts['typecheck:tests']) {
		manifest.scripts['typecheck:tests'] =
			'tsc --project tsconfig.tests.json --noEmit';
		changed = true;
	}

	return changed;
}

function ensureManifestPeerDependencies(
	manifest: PackageManifest,
	dependenciesToAdd: Set<string>,
	dependenciesToRemove: Set<string>
): boolean {
	if (dependenciesToAdd.size === 0 && dependenciesToRemove.size === 0) {
		return false;
	}

	let changed = false;
	manifest.peerDependencies = manifest.peerDependencies ?? {};

	for (const dependencyName of dependenciesToAdd) {
		if (manifest.peerDependencies[dependencyName] === 'workspace:*') {
			continue;
		}

		manifest.peerDependencies[dependencyName] = 'workspace:*';
		changed = true;
	}

	for (const dependencyName of dependenciesToRemove) {
		if (!(dependencyName in manifest.peerDependencies)) {
			continue;
		}

		delete manifest.peerDependencies[dependencyName];
		changed = true;
	}

	if (changed) {
		const ordered = Object.keys(manifest.peerDependencies)
			.sort((left, right) => left.localeCompare(right))
			.reduce<Record<string, string>>((accumulator, key) => {
				accumulator[key] = manifest.peerDependencies![key]!;
				return accumulator;
			}, {});

		manifest.peerDependencies = ordered;
	}

	return changed;
}

function updatePackageManifest(
	packageDir: string,
	dependenciesToAdd: Set<string>,
	dependenciesToRemove: Set<string>
): PackageManifest | null {
	const manifestPath = path.join(packageDir, 'package.json');
	const manifest = readJsonFile<PackageManifest>(manifestPath);

	if (!manifest) {
		return null;
	}

	let changed = false;

	if (ensureManifestScripts(manifest)) {
		changed = true;
	}

	if (
		ensureManifestPeerDependencies(
			manifest,
			dependenciesToAdd,
			dependenciesToRemove
		)
	) {
		changed = true;
	}

	if (changed) {
		writeJsonFile(manifestPath, manifest);
	}

	return manifest;
}

function ensureTsconfig(packageDir: string, repoRoot: string): void {
	const mainConfigPath = path.join(packageDir, 'tsconfig.json');
	if (!fs.existsSync(mainConfigPath)) {
		const config = {
			$schema: 'https://json.schemastore.org/tsconfig',
			extends: relativeFromPackage(
				packageDir,
				path.join(repoRoot, 'tsconfig.lib.json')
			),
			compilerOptions: {
				rootDir: './src',
				outDir: './dist',
			},
			include: [
				'src/**/*',
				joinRelativeDirectory(
					relativeFromPackage(
						packageDir,
						path.join(repoRoot, 'types')
					),
					'**/*.d.ts'
				),
			],
			exclude: [
				'node_modules',
				'dist',
				'**/*.test.ts',
				'**/*.test.tsx',
				'**/*.test-support.ts',
				'**/*.test-support.tsx',
			],
		};

		writeJsonFile(mainConfigPath, config);
	}

	const testsConfigPath = path.join(packageDir, 'tsconfig.tests.json');
	if (!fs.existsSync(testsConfigPath)) {
		const config = {
			$schema: 'https://json.schemastore.org/tsconfig',
			extends: relativeFromPackage(
				packageDir,
				path.join(repoRoot, 'tsconfig.tests.json')
			),
			compilerOptions: {
				rootDir: relativeFromPackage(packageDir, repoRoot),
				outDir: './dist-tests',
			},
			include: [
				'src/**/*',
				'tests/**/*',
				joinRelativeDirectory(
					relativeFromPackage(
						packageDir,
						path.join(repoRoot, 'tests')
					),
					'**/*'
				),
				joinRelativeDirectory(
					relativeFromPackage(
						packageDir,
						path.join(repoRoot, 'scripts')
					),
					'register-workspace.ts'
				),
				joinRelativeDirectory(
					relativeFromPackage(
						packageDir,
						path.join(repoRoot, 'packages/test-utils/src')
					),
					'**/*'
				),
			],
			exclude: [
				'node_modules',
				'dist',
				'dist-tests',
				'**/dist',
				'**/*.test-support.d.ts',
			],
		};

		writeJsonFile(testsConfigPath, config);
	}
}

function ensureRootReferences(packageDir: string, repoRoot: string): void {
	const tsconfigPath = path.join(repoRoot, 'tsconfig.json');
	const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as {
		references?: Array<{ path: string }>;
		files?: string[];
	};

	tsconfig.references = tsconfig.references ?? [];
	const relativeWorkspacePath = ensurePosix(
		path.relative(repoRoot, packageDir)
	);
	const workspaceReference = `./${relativeWorkspacePath}`;
	const testsReference = `./${relativeWorkspacePath}/tsconfig.tests.json`;

	if (!tsconfig.references.some((ref) => ref.path === workspaceReference)) {
		tsconfig.references.push({ path: workspaceReference });
	}

	if (!tsconfig.references.some((ref) => ref.path === testsReference)) {
		tsconfig.references.push({ path: testsReference });
	}

	writeJsonFile(tsconfigPath, {
		...tsconfig,
		$schema: 'https://json.schemastore.org/tsconfig',
		extends: './tsconfig.base.json',
		files: tsconfig.files ?? [],
	});
}

type TsConfig = {
	readonly references?: Array<{ path: string }>;
	readonly [key: string]: unknown;
};

function normalizeReferenceTarget(
	configDir: string,
	referencePath: string
): string {
	const absolute = path.resolve(configDir, referencePath);
	if (referencePath.endsWith('.json')) {
		return path.dirname(absolute);
	}

	return absolute;
}

function createReferencePath(configDir: string, dependencyDir: string): string {
	const relative = ensurePosix(path.relative(configDir, dependencyDir));
	if (!relative || relative === '.') {
		return '.';
	}

	return relative.startsWith('.') ? relative : `./${relative}`;
}

function readTsconfig(tsconfigPath: string): TsConfig {
	if (!fs.existsSync(tsconfigPath)) {
		return {};
	}

	return JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as TsConfig;
}

function createReferenceMap(
	configDir: string,
	existingReferences: Array<{ path: string }> | undefined
): Map<string, { path: string }> {
	const referenceMap = new Map<string, { path: string }>();

	for (const reference of existingReferences ?? []) {
		if (!reference?.path) {
			continue;
		}

		const target = normalizeReferenceTarget(configDir, reference.path);
		referenceMap.set(target, reference);
	}

	return referenceMap;
}

function removeReferenceTargets(
	referenceMap: Map<string, { path: string }> | undefined,
	dependencyDirsToRemove: readonly string[]
): boolean {
	if (!referenceMap || referenceMap.size === 0) {
		return false;
	}

	let dirty = false;

	for (const dependencyDir of dependencyDirsToRemove) {
		const target = path.resolve(dependencyDir);
		if (referenceMap.delete(target)) {
			dirty = true;
		}
	}

	return dirty;
}

function addReferenceTargets(
	referenceMap: Map<string, { path: string }>,
	configDir: string,
	dependencyDirsToAdd: readonly string[]
): boolean {
	let dirty = false;

	for (const dependencyDir of dependencyDirsToAdd) {
		const target = path.resolve(dependencyDir);
		if (referenceMap.has(target)) {
			continue;
		}

		referenceMap.set(target, {
			path: createReferencePath(configDir, dependencyDir),
		});
		dirty = true;
	}

	return dirty;
}

function updateTsconfigReferences(
	tsconfigPath: string,
	dependencyDirsToAdd: readonly string[],
	dependencyDirsToRemove: readonly string[]
): void {
	if (!fs.existsSync(tsconfigPath)) {
		return;
	}

	const configDir = path.dirname(tsconfigPath);
	const tsconfig = readTsconfig(tsconfigPath);
	const referenceMap = createReferenceMap(configDir, tsconfig.references);

	const removed = removeReferenceTargets(
		referenceMap,
		dependencyDirsToRemove
	);
	const added = addReferenceTargets(
		referenceMap,
		configDir,
		dependencyDirsToAdd
	);

	if (!removed && !added) {
		return;
	}

	const sortedReferences = Array.from(referenceMap.values()).sort(
		(left, right) => {
			return left.path.localeCompare(right.path);
		}
	);

	writeJsonFile(tsconfigPath, {
		...tsconfig,
		references: sortedReferences,
	});
}

function detectDependencyCycle(
	packageDir: string,
	dependencyDir: string
): boolean {
	const dependencyConfigs = [
		path.join(dependencyDir, 'tsconfig.json'),
		path.join(dependencyDir, 'tsconfig.tests.json'),
	];

	for (const configPath of dependencyConfigs) {
		if (!fs.existsSync(configPath)) {
			continue;
		}

		const configDir = path.dirname(configPath);
		const tsconfig = readTsconfig(configPath);
		for (const reference of tsconfig.references ?? []) {
			if (!reference?.path) {
				continue;
			}

			const target = normalizeReferenceTarget(configDir, reference.path);
			if (path.resolve(target) === path.resolve(packageDir)) {
				return true;
			}
		}
	}

	return false;
}

function updateWorkspaceDependencies(
	packageDir: string,
	repoRoot: string,
	dependencyDirsToAdd: readonly string[],
	dependencyDirsToRemove: readonly string[],
	logger: Logger
): void {
	if (
		dependencyDirsToAdd.length === 0 &&
		dependencyDirsToRemove.length === 0
	) {
		return;
	}

	updateTsconfigReferences(
		path.join(packageDir, 'tsconfig.json'),
		dependencyDirsToAdd,
		dependencyDirsToRemove
	);
	updateTsconfigReferences(
		path.join(packageDir, 'tsconfig.tests.json'),
		dependencyDirsToAdd,
		dependencyDirsToRemove
	);

	for (const dependencyDir of dependencyDirsToAdd) {
		if (detectDependencyCycle(packageDir, dependencyDir)) {
			const dependencyName = ensurePosix(
				path.relative(repoRoot, dependencyDir)
			);
			const packageName = ensurePosix(
				path.relative(repoRoot, packageDir)
			);
			logger.warn(
				`Potential cyclic dependency detected between "${packageName}" and "${dependencyName}".`
			);
		}
	}
}

export function registerWorkspace(options: RegisterWorkspaceOptions): void {
	const {
		workspaceInput,
		dependenciesToAdd = [],
		dependenciesToRemove = [],
		cwd = process.cwd(),
		logger = console,
	} = options;

	const repoRoot = findRepoRoot(cwd);
	const packageDir = resolveWorkspaceDir(workspaceInput, repoRoot, cwd);

	const dependencyDirsToAdd = resolveDependencyDirectories(
		dependenciesToAdd,
		packageDir,
		repoRoot,
		cwd,
		logger,
		{ skipSelf: true }
	);
	const dependencyDirsToRemove = resolveDependencyDirectories(
		dependenciesToRemove,
		packageDir,
		repoRoot,
		cwd,
		logger,
		{ skipSelf: false }
	);

	ensureTsconfig(packageDir, repoRoot);
	ensureRootReferences(packageDir, repoRoot);
	const dependencyNamesToAdd = collectDependencyNames(
		dependencyDirsToAdd,
		logger,
		'add'
	);
	const dependencyNamesToRemove = collectDependencyNames(
		dependencyDirsToRemove,
		logger,
		'remove'
	);
	const manifest = updatePackageManifest(
		packageDir,
		dependencyNamesToAdd,
		dependencyNamesToRemove
	);

	const packageName = manifest?.name;
	if (typeof packageName === 'string' && packageName.length > 0) {
		ensureTsconfigBasePaths(packageDir, repoRoot, packageName, logger);
	} else {
		logger.warn(
			`Skipping tsconfig.base.json path updates for ${packageDir} because package.json is missing the "name" field.`
		);
	}
	updateWorkspaceDependencies(
		packageDir,
		repoRoot,
		dependencyDirsToAdd,
		dependencyDirsToRemove,
		logger
	);

	logger.log(`Workspace scaffolding ensured for ${packageDir}`);
}

function parseListOption(raw: string | undefined): string[] {
	if (!raw) {
		return [];
	}

	return raw
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

function parseCliArguments(argv: readonly string[]): CliArguments {
	let workspaceInput: string | null = null;
	const dependenciesToAdd = new Set<string>();
	const dependenciesToRemove = new Set<string>();

	for (const argument of argv) {
		if (argument.startsWith('--deps=')) {
			const values = parseListOption(argument.slice('--deps='.length));
			for (const value of values) {
				dependenciesToAdd.add(value);
			}
			continue;
		}

		if (argument.startsWith('--remove-deps=')) {
			const values = parseListOption(
				argument.slice('--remove-deps='.length)
			);
			for (const value of values) {
				dependenciesToRemove.add(value);
			}
			continue;
		}

		if (argument === '--help') {
			return {
				workspaceInput: null,
				dependenciesToAdd: [],
				dependenciesToRemove: [],
			};
		}

		if (!workspaceInput) {
			workspaceInput = argument;
			continue;
		}

		throw new Error(`Unexpected argument "${argument}".`);
	}

	return {
		workspaceInput,
		dependenciesToAdd: Array.from(dependenciesToAdd),
		dependenciesToRemove: Array.from(dependenciesToRemove),
	};
}

function main(): void {
	const { workspaceInput, dependenciesToAdd, dependenciesToRemove } =
		parseCliArguments(process.argv.slice(2));

	if (!workspaceInput) {
		console.error(
			'Usage: pnpm exec tsx scripts/register-workspace.ts <workspace> [--deps=@wpkernel/core,@wpkernel/ui] [--remove-deps=@wpkernel/core]'
		);
		process.exitCode = 1;
		return;
	}

	registerWorkspace({
		workspaceInput,
		dependenciesToAdd,
		dependenciesToRemove,
	});
}

const invokedFromCommandLine = Boolean(
	process.argv[1] &&
		path.basename(process.argv[1]).includes('register-workspace')
);

if (invokedFromCommandLine) {
	main();
}

export { parseCliArguments };
