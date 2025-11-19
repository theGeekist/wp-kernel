#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
	PREBUILD_SETS,
	WORKSPACE_DIRS,
} from './workspace-build.constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

if (process.env.WPKERNEL_PREBUILD_BYPASS === '1') {
	console.log('prebuild: bypassed (WPKERNEL_PREBUILD_BYPASS=1).');
	process.exit(0);
}

function parseArgs(argv) {
	const primaries = [];
	const also = [];
	for (let idx = 0; idx < argv.length; idx += 1) {
		const arg = argv[idx];
		if (arg === '--also') {
			const next = argv[idx + 1];
			if (!next || next.startsWith('-')) {
				throw new Error('--also requires a workspace name');
			}
			also.push(next);
			idx += 1;
			continue;
		}
		if (arg.startsWith('-')) {
			continue;
		}
		primaries.push(arg);
	}
	return { primaries, also };
}

function unique(values) {
	return [...new Set(values)];
}

function resolveSequence(targets) {
	const sequence = [];
	for (const target of targets) {
		const deps = PREBUILD_SETS[target];
		if (!deps || deps.length === 0) {
			continue;
		}
		for (const dep of deps) {
			if (!sequence.includes(dep)) {
				sequence.push(dep);
			}
		}
	}
	return sequence;
}

function runCommand(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			cwd: repoRoot,
			env: { ...process.env, ...options.env },
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

async function needsBuild(workspace) {
	const dir = WORKSPACE_DIRS[workspace];
	if (!dir) {
		return true;
	}
	const distPath = path.join(repoRoot, dir, 'dist');
	try {
		await access(distPath);
		return false;
	} catch {
		return true;
	}
}

async function main() {
	const { primaries, also } = parseArgs(process.argv.slice(2));
	if (primaries.length === 0) {
		console.error(
			'Usage: node scripts/workspace-graph.prebuild.mjs <workspace> [...]'
		);
		process.exit(1);
	}

	const sequence = resolveSequence(unique(primaries));
	if (sequence.length === 0) {
		console.log('prebuild: nothing required compiling.');
	} else {
		for (const workspace of sequence) {
			const shouldBuild = await needsBuild(workspace);
			if (!shouldBuild) {
				console.log(
					`prebuild: skipping ${workspace}, dist already built.`
				);
				continue;
			}
			console.log(`prebuild: building ${workspace}`);
			await runCommand('pnpm', ['--filter', workspace, 'build'], {
				env: { WPKERNEL_PREBUILD_BYPASS: '1' },
			});
		}
	}

	const extras = unique(also).filter((name) => !primaries.includes(name));
	for (const workspace of extras) {
		const shouldBuild = await needsBuild(workspace);
		if (!shouldBuild) {
			console.log(
				`prebuild: skipping ${workspace}, dist already built (also).`
			);
			continue;
		}
		console.log(`prebuild: ensuring ${workspace} is built.`);
		await runCommand('pnpm', ['--filter', workspace, 'build'], {
			env: { WPKERNEL_PREBUILD_BYPASS: '1' },
		});
	}
}

main().catch((error) => {
	console.error('prebuild: failed to build dependencies:', error);
	process.exitCode = 1;
});
