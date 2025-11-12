#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWorkspace = void 0;
exports.updateWorkspace = updateWorkspace;
exports.createWorkspace = createWorkspace;
exports.removeWorkspace = removeWorkspace;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const jsonc_parser_1 = require("jsonc-parser");
const jsonFormattingOptions = {
    insertSpaces: false,
    tabSize: 4,
    eol: '\n',
};
const DEFAULT_PACKAGE_SCRIPTS = {
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
};
function ensurePosix(value) {
    return value.split(node_path_1.default.sep).join('/');
}
function parseListOption(raw) {
    if (!raw) {
        return [];
    }
    return raw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}
function isWorkspacePathWithinRepo(repoRoot, targetDir) {
    const relative = ensurePosix(node_path_1.default.relative(repoRoot, targetDir));
    if (!relative || relative === '.' || relative.startsWith('..')) {
        return false;
    }
    const [topLevel, secondLevel] = relative.split('/');
    if ((topLevel === 'packages' || topLevel === 'examples') &&
        typeof secondLevel === 'string' &&
        secondLevel.length > 0) {
        return true;
    }
    return false;
}
function assertWorkspacePathWithinRepo(repoRoot, targetDir) {
    if (!isWorkspacePathWithinRepo(repoRoot, targetDir)) {
        const relative = ensurePosix(node_path_1.default.relative(repoRoot, targetDir));
        throw new Error(`Workspace path must resolve within the repository's packages/ or examples/ directories. Received "${relative || targetDir}".`);
    }
}
function findRepoRoot(startDir) {
    let current = startDir;
    while (!node_fs_1.default.existsSync(node_path_1.default.join(current, 'pnpm-workspace.yaml'))) {
        const parent = node_path_1.default.dirname(current);
        if (parent === current) {
            throw new Error('Unable to locate repository root. Run this script from within the repository.');
        }
        current = parent;
    }
    return current;
}
function readJsonFile(filePath) {
    if (!node_fs_1.default.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(node_fs_1.default.readFileSync(filePath, 'utf8'));
}
function writeJsonFile(filePath, contents) {
    const formatted = `${JSON.stringify(contents, null, '\t')}\n`;
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(filePath), { recursive: true });
    node_fs_1.default.writeFileSync(filePath, formatted, 'utf8');
}
function writeFile(filePath, contents) {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(filePath), { recursive: true });
    node_fs_1.default.writeFileSync(filePath, contents, 'utf8');
}
function arraysEqual(left, right) {
    if (!left || left.length !== right.length) {
        return false;
    }
    return left.every((value, index) => value === right[index]);
}
function relativeFromPackage(packageDir, target) {
    const relativePath = ensurePosix(node_path_1.default.relative(packageDir, target));
    if (!relativePath || relativePath === '.') {
        return '.';
    }
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}
function joinRelativeDirectory(base, suffix) {
    if (base === '.') {
        return suffix.startsWith('./') ? suffix : `./${suffix}`;
    }
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return `${normalized}${suffix}`;
}
function relativeFromRoot(repoRoot, target) {
    const relativePath = ensurePosix(node_path_1.default.relative(repoRoot, target));
    if (!relativePath || relativePath === '.') {
        return '.';
    }
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}
function resolveExistingWorkspaceDir(input, repoRoot, cwd) {
    const cwdCandidate = node_path_1.default.resolve(cwd, input);
    if (node_fs_1.default.existsSync(cwdCandidate)) {
        assertWorkspacePathWithinRepo(repoRoot, cwdCandidate);
        return cwdCandidate;
    }
    const packageName = input.startsWith('@')
        ? (input.split('/').pop() ?? input)
        : input;
    const packagePath = node_path_1.default.join(repoRoot, 'packages', packageName);
    if (node_fs_1.default.existsSync(packagePath)) {
        assertWorkspacePathWithinRepo(repoRoot, packagePath);
        return packagePath;
    }
    const examplePath = node_path_1.default.join(repoRoot, 'examples', packageName);
    if (node_fs_1.default.existsSync(examplePath)) {
        assertWorkspacePathWithinRepo(repoRoot, examplePath);
        return examplePath;
    }
    throw new Error(`Unable to resolve workspace directory for "${input}".`);
}
function detectWorkspaceKind(repoRoot, packageDir) {
    const relative = ensurePosix(node_path_1.default.relative(repoRoot, packageDir));
    if (relative.startsWith('examples/')) {
        return 'example';
    }
    return 'package';
}
function ensureManifestScripts(manifest) {
    let changed = false;
    const scripts = { ...(manifest.scripts ?? {}) };
    for (const [name, command] of Object.entries(DEFAULT_PACKAGE_SCRIPTS)) {
        if (scripts[name]) {
            continue;
        }
        scripts[name] = command;
        changed = true;
    }
    if (changed) {
        manifest.scripts = Object.keys(scripts)
            .sort((left, right) => left.localeCompare(right))
            .reduce((accumulator, key) => {
            accumulator[key] = scripts[key];
            return accumulator;
        }, {});
    }
    return changed;
}
function ensureManifestPeerDependencies(manifest, dependenciesToAdd, dependenciesToRemove) {
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
        manifest.peerDependencies = Object.keys(manifest.peerDependencies)
            .sort((left, right) => left.localeCompare(right))
            .reduce((accumulator, key) => {
            accumulator[key] = manifest.peerDependencies[key];
            return accumulator;
        }, {});
    }
    return changed;
}
function updatePackageManifest(packageDir, dependenciesToAdd, dependenciesToRemove) {
    const manifestPath = node_path_1.default.join(packageDir, 'package.json');
    const manifest = readJsonFile(manifestPath);
    if (!manifest) {
        return null;
    }
    let changed = false;
    if (ensureManifestScripts(manifest)) {
        changed = true;
    }
    if (ensureManifestPeerDependencies(manifest, dependenciesToAdd, dependenciesToRemove)) {
        changed = true;
    }
    if (changed) {
        writeJsonFile(manifestPath, manifest);
    }
    return manifest;
}
function ensureTsconfig(packageDir, repoRoot) {
    const mainConfigPath = node_path_1.default.join(packageDir, 'tsconfig.json');
    if (!node_fs_1.default.existsSync(mainConfigPath)) {
        const config = {
            $schema: 'https://json.schemastore.org/tsconfig',
            extends: relativeFromPackage(packageDir, node_path_1.default.join(repoRoot, 'tsconfig.lib.json')),
            compilerOptions: {
                rootDir: './src',
                outDir: './dist',
            },
            include: [
                'src/**/*',
                joinRelativeDirectory(relativeFromPackage(packageDir, node_path_1.default.join(repoRoot, 'types')), '**/*.d.ts'),
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
    const testsConfigPath = node_path_1.default.join(packageDir, 'tsconfig.tests.json');
    if (!node_fs_1.default.existsSync(testsConfigPath)) {
        const config = {
            $schema: 'https://json.schemastore.org/tsconfig',
            extends: relativeFromPackage(packageDir, node_path_1.default.join(repoRoot, 'tsconfig.tests.json')),
            compilerOptions: {
                rootDir: relativeFromPackage(packageDir, repoRoot),
                outDir: './dist-tests',
            },
            include: [
                'src/**/*',
                'tests/**/*',
                joinRelativeDirectory(relativeFromPackage(packageDir, node_path_1.default.join(repoRoot, 'tests')), '**/*'),
                joinRelativeDirectory(relativeFromPackage(packageDir, node_path_1.default.join(repoRoot, 'scripts')), 'register-workspace.ts'),
                joinRelativeDirectory(relativeFromPackage(packageDir, node_path_1.default.join(repoRoot, 'packages/test-utils/src')), '**/*'),
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
function ensureRootReferences(packageDir, repoRoot) {
    const tsconfigPath = node_path_1.default.join(repoRoot, 'tsconfig.json');
    if (!node_fs_1.default.existsSync(tsconfigPath)) {
        return;
    }
    const tsconfig = JSON.parse(node_fs_1.default.readFileSync(tsconfigPath, 'utf8'));
    tsconfig.references = tsconfig.references ?? [];
    const relativeWorkspacePath = ensurePosix(node_path_1.default.relative(repoRoot, packageDir));
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
function normalizeReferenceTarget(configDir, referencePath) {
    const absolute = node_path_1.default.resolve(configDir, referencePath);
    if (referencePath.endsWith('.json')) {
        return node_path_1.default.dirname(absolute);
    }
    return absolute;
}
function createReferencePath(configDir, dependencyDir) {
    const relative = ensurePosix(node_path_1.default.relative(configDir, dependencyDir));
    if (!relative || relative === '.') {
        return '.';
    }
    return relative.startsWith('.') ? relative : `./${relative}`;
}
function readTsconfig(tsconfigPath) {
    if (!node_fs_1.default.existsSync(tsconfigPath)) {
        return {};
    }
    return JSON.parse(node_fs_1.default.readFileSync(tsconfigPath, 'utf8'));
}
function createReferenceMap(configDir, existingReferences) {
    const referenceMap = new Map();
    for (const reference of existingReferences ?? []) {
        if (!reference?.path) {
            continue;
        }
        const target = normalizeReferenceTarget(configDir, reference.path);
        referenceMap.set(target, reference);
    }
    return referenceMap;
}
function removeReferenceTargets(referenceMap, dependencyDirsToRemove) {
    if (!referenceMap || referenceMap.size === 0) {
        return false;
    }
    let dirty = false;
    for (const dependencyDir of dependencyDirsToRemove) {
        const target = node_path_1.default.resolve(dependencyDir);
        if (referenceMap.delete(target)) {
            dirty = true;
        }
    }
    return dirty;
}
function addReferenceTargets(referenceMap, configDir, dependencyDirsToAdd) {
    let dirty = false;
    for (const dependencyDir of dependencyDirsToAdd) {
        const target = node_path_1.default.resolve(dependencyDir);
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
function updateTsconfigReferences(tsconfigPath, dependencyDirsToAdd, dependencyDirsToRemove) {
    if (!node_fs_1.default.existsSync(tsconfigPath)) {
        return;
    }
    const configDir = node_path_1.default.dirname(tsconfigPath);
    const tsconfig = readTsconfig(tsconfigPath);
    const referenceMap = createReferenceMap(configDir, tsconfig.references);
    const removed = removeReferenceTargets(referenceMap, dependencyDirsToRemove);
    const added = addReferenceTargets(referenceMap, configDir, dependencyDirsToAdd);
    if (!removed && !added) {
        return;
    }
    const sortedReferences = Array.from(referenceMap.values()).sort((left, right) => left.path.localeCompare(right.path));
    writeJsonFile(tsconfigPath, {
        ...tsconfig,
        references: sortedReferences,
    });
}
function detectDependencyCycle(packageDir, dependencyDir) {
    const dependencyConfigs = [
        node_path_1.default.join(dependencyDir, 'tsconfig.json'),
        node_path_1.default.join(dependencyDir, 'tsconfig.tests.json'),
    ];
    for (const configPath of dependencyConfigs) {
        if (!node_fs_1.default.existsSync(configPath)) {
            continue;
        }
        const configDir = node_path_1.default.dirname(configPath);
        const tsconfig = readTsconfig(configPath);
        for (const reference of tsconfig.references ?? []) {
            if (!reference?.path) {
                continue;
            }
            const target = normalizeReferenceTarget(configDir, reference.path);
            if (node_path_1.default.resolve(target) === node_path_1.default.resolve(packageDir)) {
                return true;
            }
        }
    }
    return false;
}
function resolveDependencyDirectories(dependencies, packageDir, repoRoot, cwd, logger, { skipSelf }) {
    if (dependencies.length === 0) {
        return [];
    }
    const directories = new Map();
    for (const dependency of dependencies) {
        const resolvedDir = resolveExistingWorkspaceDir(dependency, repoRoot, cwd);
        if (skipSelf &&
            node_path_1.default.resolve(resolvedDir) === node_path_1.default.resolve(packageDir)) {
            logger.warn(`Skipping self dependency "${dependency}".`);
            continue;
        }
        directories.set(node_path_1.default.resolve(resolvedDir), resolvedDir);
    }
    return Array.from(directories.values());
}
function collectDependencyNames(dependencyDirs, logger, action) {
    const names = new Set();
    for (const dependencyDir of dependencyDirs) {
        const manifestPath = node_path_1.default.join(dependencyDir, 'package.json');
        const manifest = readJsonFile(manifestPath);
        if (!manifest?.name) {
            logger.warn(`Skipping dependency metadata update for ${dependencyDir} while attempting to ${action} dependencies because package.json is missing a "name" field.`);
            continue;
        }
        names.add(manifest.name);
    }
    return names;
}
function ensureTsconfigBasePaths(packageDir, repoRoot, packageName, logger) {
    const baseConfigPath = node_path_1.default.join(repoRoot, 'tsconfig.base.json');
    if (!node_fs_1.default.existsSync(baseConfigPath)) {
        logger.warn(`Unable to update tsconfig.base.json because it does not exist at ${baseConfigPath}.`);
        return;
    }
    let content = node_fs_1.default.readFileSync(baseConfigPath, 'utf8');
    let parsed = (0, jsonc_parser_1.parse)(content);
    if (!parsed || typeof parsed !== 'object') {
        logger.warn(`Unable to parse tsconfig.base.json when updating paths for ${packageName}.`);
        return;
    }
    if (!parsed.compilerOptions) {
        const edits = (0, jsonc_parser_1.modify)(content, ['compilerOptions'], {}, {
            formattingOptions: jsonFormattingOptions,
        });
        content = (0, jsonc_parser_1.applyEdits)(content, edits);
        parsed = (0, jsonc_parser_1.parse)(content);
    }
    if (!parsed.compilerOptions?.paths) {
        const edits = (0, jsonc_parser_1.modify)(content, ['compilerOptions', 'paths'], {}, {
            formattingOptions: jsonFormattingOptions,
        });
        content = (0, jsonc_parser_1.applyEdits)(content, edits);
        parsed = (0, jsonc_parser_1.parse)(content);
    }
    const desiredEntry = [
        relativeFromRoot(repoRoot, node_path_1.default.join(packageDir, 'src/index.ts')),
    ];
    const desiredWildcardEntry = [
        relativeFromRoot(repoRoot, node_path_1.default.join(packageDir, 'src/*')),
    ];
    let changed = false;
    const ensureEntry = (key, desired) => {
        const current = parsed.compilerOptions?.paths?.[key];
        if (arraysEqual(current, desired)) {
            return;
        }
        const edits = (0, jsonc_parser_1.modify)(content, ['compilerOptions', 'paths', key], desired, { formattingOptions: jsonFormattingOptions });
        content = (0, jsonc_parser_1.applyEdits)(content, edits);
        parsed = (0, jsonc_parser_1.parse)(content);
        changed = true;
    };
    ensureEntry(packageName, desiredEntry);
    ensureEntry(`${packageName}/*`, desiredWildcardEntry);
    if (changed) {
        node_fs_1.default.writeFileSync(baseConfigPath, content, 'utf8');
    }
}
function removeTsconfigBasePaths(repoRoot, packageName, logger) {
    const baseConfigPath = node_path_1.default.join(repoRoot, 'tsconfig.base.json');
    if (!node_fs_1.default.existsSync(baseConfigPath)) {
        return;
    }
    let content = node_fs_1.default.readFileSync(baseConfigPath, 'utf8');
    const parsed = (0, jsonc_parser_1.parse)(content);
    if (!parsed?.compilerOptions?.paths) {
        return;
    }
    const keysToRemove = [`${packageName}`, `${packageName}/*`];
    let changed = false;
    for (const key of keysToRemove) {
        if (!(key in parsed.compilerOptions.paths)) {
            continue;
        }
        const edits = (0, jsonc_parser_1.modify)(content, ['compilerOptions', 'paths', key], undefined, { formattingOptions: jsonFormattingOptions });
        content = (0, jsonc_parser_1.applyEdits)(content, edits);
        changed = true;
    }
    if (changed) {
        node_fs_1.default.writeFileSync(baseConfigPath, content, 'utf8');
        logger.log(`Removed TypeScript path aliases for ${packageName}.`);
    }
}
function updateWorkspaceDependencies(packageDir, repoRoot, dependencyDirsToAdd, dependencyDirsToRemove, logger) {
    if (dependencyDirsToAdd.length === 0 &&
        dependencyDirsToRemove.length === 0) {
        return;
    }
    updateTsconfigReferences(node_path_1.default.join(packageDir, 'tsconfig.json'), dependencyDirsToAdd, dependencyDirsToRemove);
    updateTsconfigReferences(node_path_1.default.join(packageDir, 'tsconfig.tests.json'), dependencyDirsToAdd, dependencyDirsToRemove);
    for (const dependencyDir of dependencyDirsToAdd) {
        if (detectDependencyCycle(packageDir, dependencyDir)) {
            const dependencyName = ensurePosix(node_path_1.default.relative(repoRoot, dependencyDir));
            const packageName = ensurePosix(node_path_1.default.relative(repoRoot, packageDir));
            logger.warn(`Potential cyclic dependency detected between "${packageName}" and "${dependencyName}".`);
        }
    }
}
function removeRootReferences(repoRoot, packageDir) {
    const tsconfigPath = node_path_1.default.join(repoRoot, 'tsconfig.json');
    if (!node_fs_1.default.existsSync(tsconfigPath)) {
        return;
    }
    const tsconfig = JSON.parse(node_fs_1.default.readFileSync(tsconfigPath, 'utf8'));
    const relative = ensurePosix(node_path_1.default.relative(repoRoot, packageDir));
    const targetPaths = new Set([
        `./${relative}`,
        `./${relative}/tsconfig.tests.json`,
    ]);
    const originalLength = tsconfig.references?.length ?? 0;
    tsconfig.references = (tsconfig.references ?? []).filter((reference) => !targetPaths.has(reference.path));
    if ((tsconfig.references?.length ?? 0) === originalLength) {
        return;
    }
    writeJsonFile(tsconfigPath, tsconfig);
}
function ensureDirectoryIsEmpty(target) {
    if (!node_fs_1.default.existsSync(target)) {
        return;
    }
    const contents = node_fs_1.default.readdirSync(target);
    if (contents.length === 0) {
        return;
    }
    throw new Error(`Target directory ${target} already exists and is not empty.`);
}
function toPascalCase(value) {
    return value
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('');
}
function readRepoVersion(repoRoot) {
    const manifest = readJsonFile(node_path_1.default.join(repoRoot, 'package.json'));
    return manifest?.version ?? '0.0.0';
}
function scaffoldPackage(repoRoot, packageDir, kind) {
    ensureDirectoryIsEmpty(packageDir);
    const version = readRepoVersion(repoRoot);
    const slug = node_path_1.default.basename(packageDir);
    const pascalName = toPascalCase(slug);
    const packageName = kind === 'example' ? `wp-kernel-${slug}` : `@wpkernel/${slug}`;
    const packageManifest = {
        name: packageName,
        version,
        description: kind === 'example'
            ? `${pascalName} example for WPKernel`
            : `${pascalName} package for WPKernel`,
        type: 'module',
        sideEffects: false,
        ...(kind === 'example'
            ? { private: true }
            : {
                publishConfig: {
                    access: 'public',
                    registry: 'https://registry.npmjs.org/',
                    tag: 'beta',
                },
            }),
        main: './dist/index.js',
        module: './dist/index.js',
        types: './dist/index.d.ts',
        exports: {
            '.': {
                types: './dist/index.d.ts',
                import: './dist/index.js',
                default: './dist/index.js',
            },
            './package.json': './package.json',
        },
        files: ['dist'],
        scripts: DEFAULT_PACKAGE_SCRIPTS,
        devDependencies: {
            '@wpkernel/scripts': 'workspace:*',
        },
    };
    writeJsonFile(node_path_1.default.join(packageDir, 'package.json'), packageManifest);
    const readme = `# ${pascalName}\n\n> Generated by \`pnpm monorepo:create\`. Replace this text with a package description.\n`;
    writeFile(node_path_1.default.join(packageDir, 'README.md'), `${readme}`);
    const jestConfig = `import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
        displayName: '${packageName}',
        packageDir: import.meta.url,
});
`;
    writeFile(node_path_1.default.join(packageDir, 'jest.config.js'), jestConfig);
    const viteConfig = `import { createWPKLibConfig } from '../../vite.config.base';

export default createWPKLibConfig('${packageName}', {
        index: 'src/index.ts',
});
`;
    writeFile(node_path_1.default.join(packageDir, 'vite.config.ts'), viteConfig);
    const typesContent = `export interface ${pascalName}Greeting {
\treadonly message: string;
}
`;
    writeFile(node_path_1.default.join(packageDir, 'src/types.ts'), typesContent);
    const indexContent = `import type { ${pascalName}Greeting } from './types';

export type { ${pascalName}Greeting } from './types';

export function create${pascalName}Greeting(
\tname: string = 'world'
): ${pascalName}Greeting {
\treturn { message: \`Hello from ${pascalName} \${name}!\` };
}
`;
    writeFile(node_path_1.default.join(packageDir, 'src/index.ts'), indexContent);
    const unitTest = `import { create${pascalName}Greeting } from '../src/index';

describe('create${pascalName}Greeting', () => {
\tit('creates a greeting message', () => {
\t\texpect(create${pascalName}Greeting('unit')).toEqual({
\t\t\tmessage: 'Hello from ${pascalName} unit!',
\t\t});
\t\texpect(create${pascalName}Greeting()).toEqual({
\t\t\tmessage: 'Hello from ${pascalName} world!',
\t\t});
\t});
});
`;
    writeFile(node_path_1.default.join(packageDir, 'tests/index.test.ts'), unitTest);
    const integrationTest = `import { create${pascalName}Greeting } from '../src/index';

describe('create${pascalName}Greeting integration', () => {
\tit('supports default parameters', () => {
\t\texpect(create${pascalName}Greeting()).toEqual({
\t\t\tmessage: 'Hello from ${pascalName} world!',
\t\t});
\t});
});
`;
    writeFile(node_path_1.default.join(packageDir, 'tests/index.integration.test.ts'), integrationTest);
}
function resolveCreationTarget(repoRoot, input) {
    const normalizedInput = ensurePosix(input.trim());
    if (!normalizedInput) {
        throw new Error('A workspace path must be provided.');
    }
    const [firstSegment] = normalizedInput.split('/');
    if (firstSegment !== 'packages' && firstSegment !== 'examples') {
        throw new Error('Workspace path must start with "packages/" or "examples/".');
    }
    const targetDir = node_path_1.default.resolve(repoRoot, normalizedInput);
    assertWorkspacePathWithinRepo(repoRoot, targetDir);
    const kind = firstSegment === 'examples' ? 'example' : 'package';
    return { packageDir: targetDir, kind };
}
function updateWorkspace(options) {
    const { workspaceInput, dependenciesToAdd = [], dependenciesToRemove = [], cwd = process.cwd(), logger = console, } = options;
    const repoRoot = findRepoRoot(cwd);
    const packageDir = resolveExistingWorkspaceDir(workspaceInput, repoRoot, cwd);
    const kind = detectWorkspaceKind(repoRoot, packageDir);
    const dependencyDirsToAdd = resolveDependencyDirectories(dependenciesToAdd, packageDir, repoRoot, cwd, logger, { skipSelf: true });
    const dependencyDirsToRemove = resolveDependencyDirectories(dependenciesToRemove, packageDir, repoRoot, cwd, logger, { skipSelf: false });
    ensureTsconfig(packageDir, repoRoot);
    ensureRootReferences(packageDir, repoRoot);
    const dependencyNamesToAdd = collectDependencyNames(dependencyDirsToAdd, logger, 'add');
    const dependencyNamesToRemove = collectDependencyNames(dependencyDirsToRemove, logger, 'remove');
    const manifest = updatePackageManifest(packageDir, dependencyNamesToAdd, dependencyNamesToRemove);
    const packageName = manifest?.name;
    if (kind === 'package' &&
        typeof packageName === 'string' &&
        packageName.length > 0) {
        ensureTsconfigBasePaths(packageDir, repoRoot, packageName, logger);
    }
    updateWorkspaceDependencies(packageDir, repoRoot, dependencyDirsToAdd, dependencyDirsToRemove, logger);
    logger.log(`Workspace scaffolding ensured for ${packageDir}`);
}
exports.registerWorkspace = updateWorkspace;
function createWorkspace(options) {
    const { workspaceInput, dependenciesToAdd = [], cwd = process.cwd(), logger = console, } = options;
    const repoRoot = findRepoRoot(cwd);
    const { packageDir, kind } = resolveCreationTarget(repoRoot, workspaceInput);
    scaffoldPackage(repoRoot, packageDir, kind);
    updateWorkspace({
        workspaceInput: packageDir,
        dependenciesToAdd,
        cwd,
        logger,
    });
    logger.log(`Created ${kind} workspace at ${packageDir}`);
}
function removeWorkspace(options) {
    const { workspaceInput, cwd = process.cwd(), logger = console } = options;
    const repoRoot = findRepoRoot(cwd);
    const packageDir = resolveExistingWorkspaceDir(workspaceInput, repoRoot, cwd);
    assertWorkspacePathWithinRepo(repoRoot, packageDir);
    const manifest = readJsonFile(node_path_1.default.join(packageDir, 'package.json'));
    const packageName = manifest?.name;
    const kind = detectWorkspaceKind(repoRoot, packageDir);
    removeRootReferences(repoRoot, packageDir);
    if (kind === 'package' &&
        typeof packageName === 'string' &&
        packageName.length > 0) {
        removeTsconfigBasePaths(repoRoot, packageName, logger);
    }
    if (node_fs_1.default.existsSync(packageDir)) {
        node_fs_1.default.rmSync(packageDir, { recursive: true, force: true });
    }
    logger.log(`Removed workspace at ${packageDir}`);
}
function parseCreateArguments(argv) {
    let target = null;
    const dependenciesToAdd = new Set();
    for (const argument of argv) {
        if (argument.startsWith('--deps=')) {
            for (const value of parseListOption(argument.slice('--deps='.length))) {
                dependenciesToAdd.add(value);
            }
            continue;
        }
        if (argument === '--help') {
            return { command: 'help' };
        }
        if (!target) {
            target = argument;
            continue;
        }
        throw new Error(`Unexpected argument "${argument}".`);
    }
    return {
        command: 'create',
        target,
        dependenciesToAdd: Array.from(dependenciesToAdd),
    };
}
function parseUpdateArguments(argv) {
    let target = null;
    const dependenciesToAdd = new Set();
    const dependenciesToRemove = new Set();
    for (const argument of argv) {
        if (argument.startsWith('--deps=')) {
            for (const value of parseListOption(argument.slice('--deps='.length))) {
                dependenciesToAdd.add(value);
            }
            continue;
        }
        if (argument.startsWith('--remove-deps=')) {
            for (const value of parseListOption(argument.slice('--remove-deps='.length))) {
                dependenciesToRemove.add(value);
            }
            continue;
        }
        if (argument === '--help') {
            return { command: 'help' };
        }
        if (!target) {
            target = argument;
            continue;
        }
        throw new Error(`Unexpected argument "${argument}".`);
    }
    return {
        command: 'update',
        target,
        dependenciesToAdd: Array.from(dependenciesToAdd),
        dependenciesToRemove: Array.from(dependenciesToRemove),
    };
}
function parseRemoveArguments(argv) {
    let target = null;
    for (const argument of argv) {
        if (argument === '--help') {
            return { command: 'help' };
        }
        if (!target) {
            target = argument;
            continue;
        }
        throw new Error(`Unexpected argument "${argument}".`);
    }
    return { command: 'remove', target };
}
function parseCliArguments(argv) {
    const [command, ...rest] = argv;
    if (!command || command === '--help') {
        return { command: 'help' };
    }
    switch (command) {
        case 'create':
            return parseCreateArguments(rest);
        case 'update':
            return parseUpdateArguments(rest);
        case 'remove':
            return parseRemoveArguments(rest);
        default:
            throw new Error(`Unknown command "${command}".`);
    }
}
function printUsage() {
    const binary = 'pnpm exec tsx scripts/register-workspace.ts';
    console.error('Usage:');
    console.error(`  ${binary} create <packages|examples>/<name> [--deps=@wpkernel/core,@wpkernel/ui]`);
    console.error(`  ${binary} update <workspace> [--deps=@wpkernel/core] [--remove-deps=@wpkernel/ui]`);
    console.error(`  ${binary} remove <workspace>`);
}
function main() {
    const args = parseCliArguments(process.argv.slice(2));
    switch (args.command) {
        case 'help':
            printUsage();
            return;
        case 'create':
            if (!args.target) {
                printUsage();
                process.exitCode = 1;
                return;
            }
            createWorkspace({
                workspaceInput: args.target,
                dependenciesToAdd: args.dependenciesToAdd,
            });
            return;
        case 'update':
            if (!args.target) {
                printUsage();
                process.exitCode = 1;
                return;
            }
            updateWorkspace({
                workspaceInput: args.target,
                dependenciesToAdd: args.dependenciesToAdd,
                dependenciesToRemove: args.dependenciesToRemove,
            });
            return;
        case 'remove':
            if (!args.target) {
                printUsage();
                process.exitCode = 1;
                return;
            }
            removeWorkspace({ workspaceInput: args.target });
            return;
        default:
            throw new Error('Unhandled command');
    }
}
const invokedFromCommandLine = Boolean(process.argv[1] &&
    node_path_1.default.basename(process.argv[1]).includes('register-workspace'));
if (invokedFromCommandLine) {
    main();
}
