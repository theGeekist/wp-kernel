#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('jsonc-parser');

const tscBin = require.resolve('typescript/bin/tsc');

const repoRoot = path.resolve(__dirname, '..', '..');
const packageRoot = process.cwd();
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const configInputs = args.length > 0 ? args : ['tsconfig.tests.json'];

const configCache = new Map();
const processedConfigs = new Set();
const builtPackages = new Set();

function readTsconfig(configPath) {
        const normalized = path.resolve(configPath);
        if (configCache.has(normalized)) {
                return configCache.get(normalized);
        }

        let text;
        try {
                text = fs.readFileSync(normalized, 'utf8');
        } catch (error) {
                throw new Error(`Failed to read TypeScript config at ${normalized}: ${error.message}`);
        }

        const errors = [];
        const data = parse(text, errors, { allowTrailingComma: true });
        if (errors.length > 0) {
                const [{ error, offset }] = errors;
                throw new Error(
                        `Failed to parse TypeScript config at ${normalized}: ${error} at offset ${offset}`
                );
        }

        const config = data ?? {};
        configCache.set(normalized, config);
        return config;
}

function resolveReferencePath(baseDir, referencePath) {
        const candidate = path.resolve(baseDir, referencePath);

        try {
                const stat = fs.statSync(candidate);
                if (stat.isDirectory()) {
                        const nested = path.join(candidate, 'tsconfig.json');
                        if (fs.existsSync(nested)) {
                                return nested;
                        }
                        throw new Error(
                                `Referenced project at ${candidate} does not contain a tsconfig.json file.`
                        );
                }

                return candidate;
        } catch (error) {
                if (error && error.code === 'ENOENT') {
                        const withJson = `${candidate}.json`;
                        if (fs.existsSync(withJson)) {
                                return withJson;
                        }

                        const nested = path.join(candidate, 'tsconfig.json');
                        if (fs.existsSync(nested)) {
                                return nested;
                        }
                }

                throw new Error(
                        `Unable to resolve project reference "${referencePath}" from ${baseDir}: ${error.message}`
                );
        }
}

function ensurePackageBuiltForConfig(configPath) {
        if (path.basename(configPath) !== 'tsconfig.json') {
                return;
        }

        const configDir = path.dirname(configPath);
        const packageJsonPath = path.join(configDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
                return;
        }

        let packageJson;
        try {
                packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        } catch (error) {
                throw new Error(`Failed to parse package.json at ${packageJsonPath}: ${error.message}`);
        }

        const packageName = typeof packageJson.name === 'string' ? packageJson.name : null;
        const buildScript = packageJson.scripts && typeof packageJson.scripts.build === 'string';
        if (!packageName || !buildScript) {
                return;
        }

        if (builtPackages.has(packageName)) {
                return;
        }

        // Skip the monorepo root package.
        if (path.relative(repoRoot, configDir) === '') {
                return;
        }

        let needsBuild = true;
        if (typeof packageJson.types === 'string') {
                const typesPath = path.resolve(configDir, packageJson.types);
                if (fs.existsSync(typesPath)) {
                        needsBuild = false;
                }
        } else {
                const distDir = path.resolve(configDir, 'dist');
                if (fs.existsSync(distDir)) {
                        needsBuild = false;
                }
        }

        if (needsBuild) {
                const result = spawnSync('pnpm', ['--filter', packageName, 'build'], {
                        stdio: 'inherit',
                        cwd: repoRoot,
                });

                if (result.error) {
                        throw result.error;
                }

                if (result.status !== 0) {
                        process.exit(result.status ?? 1);
                }
        }

        builtPackages.add(packageName);
}

function prepareProject(configPath) {
        const normalized = path.resolve(configPath);
        if (!fs.existsSync(normalized)) {
                throw new Error(`TypeScript config not found at ${normalized}`);
        }

        if (processedConfigs.has(normalized)) {
                return;
        }
        processedConfigs.add(normalized);

        const configDir = path.dirname(normalized);
        const config = readTsconfig(normalized);
        const references = Array.isArray(config.references) ? config.references : [];

        for (const ref of references) {
                if (!ref || typeof ref.path !== 'string') {
                        continue;
                }

                const resolvedRef = resolveReferencePath(configDir, ref.path);
                prepareProject(resolvedRef);
        }

        ensurePackageBuiltForConfig(normalized);
}

function runTypecheck(configPath) {
        const normalized = path.resolve(configPath);
        if (!fs.existsSync(normalized)) {
                throw new Error(`TypeScript config not found at ${normalized}`);
        }

        const config = readTsconfig(normalized);
        const compilerOptions = config.compilerOptions ?? {};
        const args = ['--project', normalized];

        if (compilerOptions.noEmit !== false) {
                args.push('--noEmit');
        }

        const result = spawnSync(process.execPath, [tscBin, ...args], {
                stdio: 'inherit',
        });

        if (result.error) {
                throw result.error;
        }

        if (result.status !== 0) {
                process.exit(result.status ?? 1);
        }
}

function main() {
        const resolvedConfigs = configInputs.map((input) => path.resolve(packageRoot, input));

        for (const configPath of resolvedConfigs) {
                prepareProject(configPath);
        }

        for (const configPath of resolvedConfigs) {
                runTypecheck(configPath);
        }
}

try {
        main();
} catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
}
