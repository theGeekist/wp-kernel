#!/usr/bin/env node
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT_SENTINEL = 'pnpm-workspace.yaml';

const workspaceRoot = (() => {
        const candidates = [process.env.WPKERNEL_REPO_ROOT, process.env.INIT_CWD, process.cwd()];

        const isWorkspaceRoot = (candidate) =>
                Boolean(candidate) && fs.existsSync(path.join(candidate, REPO_ROOT_SENTINEL));

        for (const candidate of candidates) {
                if (isWorkspaceRoot(candidate)) {
                        return candidate;
                }
        }

        let current = process.cwd();
        const { root } = path.parse(current);

        while (current !== root) {
                if (isWorkspaceRoot(current)) {
                        return current;
                }

                current = path.dirname(current);
        }

        return process.cwd();
})();

const normaliseRunTestsByPathArgs = (args) => {
        const normalised = [];

        for (let index = 0; index < args.length; index += 1) {
                const arg = args[index];

                if (arg === '--runTestsByPath') {
                        normalised.push(arg);

                        while (index + 1 < args.length && !args[index + 1].startsWith('-')) {
                                const candidate = args[index + 1];
                                normalised.push(resolveTestPath(candidate));
                                index += 1;
                        }

                        continue;
                }

                if (arg.startsWith('--runTestsByPath=')) {
                        const [, value = ''] = arg.split('=');
                        normalised.push(`--runTestsByPath=${resolveTestPath(value)}`);
                        continue;
                }

                normalised.push(arg);
        }

        return normalised;
};

const resolveTestPath = (testPath) => {
        if (!testPath) {
                return testPath;
        }

        if (path.isAbsolute(testPath)) {
                return testPath;
        }

        const resolvedFromCwd = path.resolve(process.cwd(), testPath);

        if (fs.existsSync(resolvedFromCwd)) {
                return resolvedFromCwd;
        }

        const resolvedFromWorkspace = path.resolve(workspaceRoot, testPath);

        if (fs.existsSync(resolvedFromWorkspace)) {
                return resolvedFromWorkspace;
        }

        return testPath;
};

const rawArgs = process.argv.slice(2);
let mode = 'default';
let jestArgs = rawArgs;

if (rawArgs[0] && !rawArgs[0].startsWith('-')) {
        mode = rawArgs[0];
        jestArgs = rawArgs.slice(1);
}

jestArgs = jestArgs.filter((arg) => arg !== '--');
jestArgs = normaliseRunTestsByPathArgs(jestArgs);

const env = { ...process.env };

const jestCacheDir = path.join(workspaceRoot, 'node_modules', '.cache', 'jest');
try {
        fs.mkdirSync(jestCacheDir, { recursive: true });
} catch (error) {
        // best-effort cache directory creation; ignore failures and let Jest decide.
}

if (!env.JEST_CACHE_DIR) {
        env.JEST_CACHE_DIR = jestCacheDir;
}

switch (mode) {
        case 'coverage':
                env.JEST_SKIP_INTEGRATION = '1';
                break;
        case 'integration':
                if (
                        !jestArgs.some(
                                (arg, index) =>
                                        arg === '--testPathPattern' ||
                                        arg === '--testPathPatterns' ||
                                        arg.startsWith('--testPathPattern=') ||
                                        arg.startsWith('--testPathPatterns=') ||
                                        (index > 0 &&
                                                (jestArgs[index - 1] === '--testPathPattern' ||
                                                        jestArgs[index - 1] === '--testPathPatterns'))
                        ) &&
                        !jestArgs.some((arg) => arg === '--runTestsByPath')
                ) {
                        jestArgs = ['--testPathPatterns', 'integration\\.test', ...jestArgs];
                }
                break;
        case 'unit':
                env.JEST_SKIP_INTEGRATION = '1';
                break;
        case 'default':
                break;
        default:
                jestArgs = rawArgs;
                break;
}

const jestBin = require.resolve('jest/bin/jest');

const defaultArgs = ['--passWithNoTests', '--watchman=false'];
const finalArgs = [jestBin, ...defaultArgs];

if (mode === 'coverage' && !jestArgs.includes('--coverage')) {
        jestArgs = [...jestArgs, '--coverage'];
}

const child = spawn(process.execPath, [...finalArgs, ...jestArgs], {
        stdio: 'inherit',
        env,
        cwd: process.cwd(),
});

child.on('close', (code, signal) => {
        if (signal) {
                // Re-emit the original termination signal so tooling and CI detect the failure.
                process.kill(process.pid, signal);
                return;
        }

        process.exit(code ?? 1);
});

child.on('error', (error) => {
        console.error(error);
        process.exit(1);
});
