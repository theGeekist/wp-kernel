#!/usr/bin/env node
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT_SENTINEL = 'pnpm-workspace.yaml';

/**
 * Try to find the monorepo root.
 * Priority:
 * 1. WPKERNEL_REPO_ROOT
 * 2. INIT_CWD (pnpm)
 * 3. walk up from CWD
 */
const workspaceRoot = (() => {
	const candidates = [
		process.env.WPKERNEL_REPO_ROOT,
		process.env.INIT_CWD,
		process.cwd(),
	];

	const isWorkspaceRoot = (candidate) =>
		Boolean(candidate) &&
		fs.existsSync(path.join(candidate, REPO_ROOT_SENTINEL));

	for (const candidate of candidates) {
		if (isWorkspaceRoot(candidate)) {
			return candidate;
		}
	}

	// walk upwards
	let current = process.cwd();
	const { root } = path.parse(current);
	while (current !== root) {
		if (isWorkspaceRoot(current)) {
			return current;
		}
		current = path.dirname(current);
	}

	// fallback - run where we are
	return process.cwd();
})();

/**
 * Resolve relative test paths for --runTestsByPath
 */
const resolveTestPath = (testPath) => {
	if (!testPath) {
		return testPath;
	}

	if (path.isAbsolute(testPath)) {
		return testPath;
	}

	const fromCwd = path.resolve(process.cwd(), testPath);
	if (fs.existsSync(fromCwd)) {
		return fromCwd;
	}

	const fromWorkspace = path.resolve(workspaceRoot, testPath);
	if (fs.existsSync(fromWorkspace)) {
		return fromWorkspace;
	}

	return testPath;
};

const normaliseRunTestsByPathArgs = (args) => {
	const normalised = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		// --runTestsByPath <file1> <file2> ...
		if (arg === '--runTestsByPath') {
			normalised.push(arg);
			while (
				index + 1 < args.length &&
				!args[index + 1].startsWith('-')
			) {
				const candidate = args[index + 1];
				normalised.push(resolveTestPath(candidate));
				index += 1;
			}
			continue;
		}

		// --runTestsByPath=foo
		if (arg.startsWith('--runTestsByPath=')) {
			const [, value = ''] = arg.split('=');
			normalised.push(
				`--runTestsByPath=${resolveTestPath(value)}`,
			);
			continue;
		}

		normalised.push(arg);
	}

	return normalised;
};

// ---------------------------------------------------------------------------
// argv parsing
// ---------------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
let mode = 'default';
let jestArgs = rawArgs;

if (rawArgs[0] && !rawArgs[0].startsWith('-')) {
	mode = rawArgs[0];
	jestArgs = rawArgs.slice(1);
}

// strip lone --
jestArgs = jestArgs.filter((arg) => arg !== '--');
// normalise test paths
jestArgs = normaliseRunTestsByPathArgs(jestArgs);

// ---------------------------------------------------------------------------
// env + cache
// ---------------------------------------------------------------------------
const env = { ...process.env };

// shared cache for all hooks/runs
const jestCacheDir = path.join(
	workspaceRoot,
	'node_modules',
	'.cache',
	'jest',
);
try {
	fs.mkdirSync(jestCacheDir, { recursive: true });
} catch {
	// best effort
}

if (!env.JEST_CACHE_DIR) {
	env.JEST_CACHE_DIR = jestCacheDir;
}

// allow caller to throttle workers, but don't force it here
// env.JEST_WORKERS = env.JEST_WORKERS ?? '2';

// ---------------------------------------------------------------------------
// mode switching
// ---------------------------------------------------------------------------
switch (mode) {
	case 'coverage':
		// keep your old behaviour: coverage skips integration
		env.JEST_SKIP_INTEGRATION = '1';
		break;
	case 'integration': {
		// if user didn't give a pattern or runTestsByPath, add one
		const hasPattern = jestArgs.some((arg, index) => {
			if (
				arg === '--testPathPattern' ||
				arg === '--testPathPatterns'
			) {
				return true;
			}
			if (
				arg.startsWith('--testPathPattern=') ||
				arg.startsWith('--testPathPatterns=')
			) {
				return true;
			}
			if (index > 0) {
				const prev = jestArgs[index - 1];
				if (
					prev === '--testPathPattern' ||
					prev === '--testPathPatterns'
				) {
					return true;
				}
			}
			return false;
		});
		const hasRunByPath = jestArgs.some(
			(arg) => arg === '--runTestsByPath',
		);

		if (!hasPattern && !hasRunByPath) {
			// your old default
			jestArgs = [
				'--testPathPatterns',
				'integration\\.test',
				...jestArgs,
			];
		}
		break;
	}
	case 'unit':
		env.JEST_SKIP_INTEGRATION = '1';
		break;
	case 'default':
		// leave it alone
		break;
	default:
		// unknown leading token → treat whole argv as raw jest args
		jestArgs = rawArgs;
		break;
}

// ---------------------------------------------------------------------------
// spawn jest
// ---------------------------------------------------------------------------
const jestBin = require.resolve('jest/bin/jest');

// keep these - they make sense for CI + pre-commit
const defaultArgs = ['--passWithNoTests', '--watchman=false'];
const finalArgs = [jestBin, ...defaultArgs];

if (mode === 'coverage' && !jestArgs.includes('--coverage')) {
	jestArgs = [...jestArgs, '--coverage'];
}

const child = spawn(
	process.execPath,
	[...finalArgs, ...jestArgs],
	{
		stdio: 'inherit',
		env,
		cwd: process.cwd(),
	},
);

child.on('close', (code, signal) => {
	if (signal) {
		// re-emit so git/CI know it was interrupted
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});

child.on('error', (error) => {
	console.error(error);
	process.exit(1);
});
