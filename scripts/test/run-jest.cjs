#!/usr/bin/env node
const { spawn } = require('node:child_process');

const rawArgs = process.argv.slice(2);
let mode = 'default';
let jestArgs = rawArgs;

if (rawArgs[0] && !rawArgs[0].startsWith('-')) {
        mode = rawArgs[0];
        jestArgs = rawArgs.slice(1);
}

jestArgs = jestArgs.filter((arg) => arg !== '--');

const env = { ...process.env };

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

child.on('close', (code) => {
        process.exit(code);
});

child.on('error', (error) => {
        console.error(error);
        process.exit(1);
});
