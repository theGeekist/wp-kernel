#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { createReporter, type Reporter } from '@wpkernel/core/reporter';

const BOOTSTRAP_NAMESPACE = `${WPK_NAMESPACE}.cli.bootstrap`;

interface BootstrapRunResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: NodeJS.Signals | null;
}

interface BootstrapRunContext {
	reporter: Reporter;
	startedAt: number;
	positional: readonly string[];
	forwardedFlagNames: readonly string[];
}

function extractForwardedFlagNames(
	forwarded: readonly string[]
): readonly string[] {
	return forwarded
		.filter((value) => value.startsWith('--'))
		.map((flag) => {
			const [name = ''] = flag.slice(2).split('=');
			return name;
		});
}

function createBootstrapReporter(): Reporter {
	return createReporter({
		namespace: BOOTSTRAP_NAMESPACE,
		channel: 'console',
	});
}

function logBootstrapStart(
	reporter: Reporter,
	positional: readonly string[],
	forwardedFlagNames: readonly string[]
): void {
	const hasTarget = positional.length > 0;
	const hasSkipInstall = forwardedFlagNames.includes('skip-install');

	reporter.info('Launching wpk create via bootstrapper.', {
		positionalCount: positional.length,
		forwardedFlags: forwardedFlagNames,
		targetProvided: hasTarget,
		skipInstall: hasSkipInstall,
	});
}

function splitBootstrapArguments(argv: readonly string[]): {
	positional: readonly string[];
	forwarded: readonly string[];
} {
	const separatorIndex = argv.indexOf('--');

	if (separatorIndex === -1) {
		return {
			positional: argv,
			forwarded: [],
		};
	}

	return {
		positional: argv.slice(0, separatorIndex),
		forwarded: argv.slice(separatorIndex + 1),
	};
}

function finalizeBootstrapRun(
	context: BootstrapRunContext,
	result: BootstrapRunResult
): void {
	const durationMs = Math.round(performance.now() - context.startedAt);
	const baseContext = {
		durationMs,
		exitCode: result.exitCode ?? undefined,
		signal: result.signal ?? undefined,
		stdoutLength: result.stdout.length,
		stderrLength: result.stderr.length,
		forwardedFlags: context.forwardedFlagNames,
		positionalCount: context.positional.length,
	} satisfies Record<string, unknown>;

	if (result.signal) {
		context.reporter.error(
			'wpk create terminated by signal when launched from bootstrapper.',
			baseContext
		);
		return;
	}

	if (typeof result.exitCode === 'number' && result.exitCode === 0) {
		context.reporter.info(
			'wpk create completed successfully via bootstrapper.',
			baseContext
		);
		return;
	}

	context.reporter.error(
		'wpk create failed when launched from bootstrapper.',
		baseContext
	);
}

const require = createRequire(import.meta.url);
const cliPackageJsonPath = require.resolve('@wpkernel/cli/package.json');
const cliPackageRoot = path.dirname(cliPackageJsonPath);
const cliPackageManifest = require(cliPackageJsonPath) as {
	bin?: Record<string, string>;
};
const cliBinRelativePath = cliPackageManifest.bin?.wpk ?? './bin/wpk.js';
const cliBinPath = path.join(cliPackageRoot, cliBinRelativePath);

const { positional, forwarded } = splitBootstrapArguments(
	process.argv.slice(2)
);
const cliArguments = ['create', ...positional, ...forwarded];
const forwardedFlagNames = extractForwardedFlagNames(forwarded);
const reporter = createBootstrapReporter();
const startedAt = performance.now();

logBootstrapStart(reporter, positional, forwardedFlagNames);

const childProcess = spawn(process.execPath, [cliBinPath, ...cliArguments], {
	env: process.env,
	stdio: ['inherit', 'pipe', 'pipe'],
});

let capturedStdout = '';
let capturedStderr = '';

childProcess.stdout?.on('data', (chunk: Buffer) => {
	capturedStdout += chunk.toString();
	process.stdout.write(chunk);
});

childProcess.stderr?.on('data', (chunk: Buffer) => {
	capturedStderr += chunk.toString();
	process.stderr.write(chunk);
});

childProcess.on('error', (error: Error) => {
	reporter.error('Failed to start wpk CLI from bootstrapper.', {
		message: error.message,
	});
	process.stderr.write(`Failed to start wpk CLI: ${error.message}\n`);
	process.exitCode = 1;
});

childProcess.on(
	'close',
	(code: number | null, signal: NodeJS.Signals | null) => {
		finalizeBootstrapRun(
			{
				reporter,
				startedAt,
				positional,
				forwardedFlagNames,
			},
			{
				stdout: capturedStdout,
				stderr: capturedStderr,
				exitCode: code,
				signal,
			}
		);

		if (signal) {
			process.kill(process.pid, signal);
			return;
		}

		if (typeof code === 'number') {
			process.exit(code);
		} else {
			process.exit(1);
		}
	}
);
