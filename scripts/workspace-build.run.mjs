#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	BASE_BUILD_ORDER,
	EXAMPLE_WORKSPACES,
} from './workspace-build.constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
	const options = {
		includeExamples: false,
		runLint: true,
		explicitOrder: [],
	};

	for (const arg of argv) {
		if (arg === '--with-examples') {
			options.includeExamples = true;
			continue;
		}
		if (arg === '--no-lint') {
			options.runLint = false;
			continue;
		}
		options.explicitOrder.push(arg);
	}

	return options;
}

function runCommand(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			cwd: repoRoot,
			env: { ...process.env },
		});
		child.on('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			const reason =
				code === null
					? `signal ${signal ?? '<unknown>'}`
					: `exit code ${code}`;
			reject(
				new Error(`${command} ${args.join(' ')} failed (${reason})`)
			);
		});
		child.on('error', (error) => reject(error));
	});
}

async function runBuildFor(workspace) {
	console.log(`build: running ${workspace}`);
	await runCommand('pnpm', ['--filter', workspace, 'build']);
}

async function main() {
	const { includeExamples, runLint, explicitOrder } = parseArgs(
		process.argv.slice(2)
	);

	let order =
		explicitOrder.length > 0
			? [...explicitOrder]
			: [...BASE_BUILD_ORDER];

	if (includeExamples) {
		order = [...order, ...EXAMPLE_WORKSPACES];
	}

	for (const workspace of order) {
		await runBuildFor(workspace);
	}

	if (runLint) {
		await runCommand('pnpm', ['run', 'lint:dts-imports:fix']);
	}
}

main().catch((error) => {
	console.error('workspace build failed:', error);
	process.exitCode = 1;
});
