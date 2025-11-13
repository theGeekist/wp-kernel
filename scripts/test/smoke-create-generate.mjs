#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
	fileURLToPath(new URL('../../', import.meta.url))
);
const artifactsDir = path.join(repoRoot, 'artifacts', 'cli-smoke');
const rawArgs = process.argv.slice(2);
const packageManagers = parsePackageManagers(rawArgs);
const cliArgs = new Set(
	rawArgs.filter((arg) => !arg.startsWith('--package-managers='))
);
const keepWorkspace = cliArgs.has('--keep-workspace');
const cleanArtifacts = cliArgs.has('--clean-artifacts');

await mkdir(artifactsDir, { recursive: true });

const smokeRoot = await mkdtemp(path.join(os.tmpdir(), 'wpk-smoke-'));
const projectDir = path.join(smokeRoot, 'wpk-smoke-project');

async function main() {
	const summary = {
		projectDir,
		artifacts: [],
		projects: [],
	};
	let success = false;

	try {
		logStep('Building workspace packages');
		await runPnpm(['build:packages']);

		logStep('Packing tarballs');
		const cliTarball = await packWorkspace('@wpkernel/cli');
		const createTarball = await packWorkspace('@wpkernel/create-wpk');
		summary.artifacts.push(cliTarball, createTarball);

		for (const packageManager of packageManagers) {
			const scopedProjectDir =
				packageManagers.length === 1
					? projectDir
					: path.join(projectDir, packageManager);

			summary.projects.push({
				packageManager,
				dir: scopedProjectDir,
			});

			logStep(`[${packageManager}] Scaffolding project via create-wpk`);
			await runNode(
				path.join(repoRoot, 'packages/create-wpk/dist/index.js'),
				[
					scopedProjectDir,
					'--',
					'--package-manager',
					packageManager,
				]
			);

			logStep(
				`[${packageManager}] Installing CLI tarball and tsx inside scaffold`
			);
			await runPnpm(['add', '-D', cliTarball, 'tsx@latest'], {
				cwd: scopedProjectDir,
			});

			logStep(`[${packageManager}] Running "wpk generate" inside scaffold`);
			await runPnpm(['exec', 'wpk', 'generate'], {
				cwd: scopedProjectDir,
			});

			logStep(`[${packageManager}] Running "wpk apply --yes" inside scaffold`);
			await runPnpm(['exec', 'wpk', 'apply', '--yes'], {
				cwd: scopedProjectDir,
			});

			logStep(
				`[${packageManager}] Re-running "wpk generate" inside scaffold (idempotency check)`
			);
			await runPnpm(['exec', 'wpk', 'generate'], {
				cwd: scopedProjectDir,
			});

			logStep(
				`[${packageManager}] Re-running "wpk apply --yes" inside scaffold (idempotency check)`
			);
			await runPnpm(['exec', 'wpk', 'apply', '--yes'], {
				cwd: scopedProjectDir,
			});
		}

		success = true;
		logSuccess(summary);
		return summary;
	} finally {
		await cleanup(summary, success);
	}
}

async function cleanup(summary, success) {
	if (!keepWorkspace) {
		await rm(smokeRoot, { recursive: true, force: true });
	} else {
		const preserved =
			summary.projects.length > 0
				? summary.projects
				: [{ packageManager: 'default', dir: summary.projectDir }];
		console.log('\nINFO Preserved temp workspace (--keep-workspace):');
		for (const project of preserved) {
			console.log(`     - [${project.packageManager}] ${project.dir}`);
		}
	}

	if (cleanArtifacts) {
		await rm(artifactsDir, { recursive: true, force: true });
		console.log('\nINFO Removed artifacts directory (--clean-artifacts).');
	} else if (!success && summary.artifacts.length > 0) {
		console.log('\nINFO Packed tarballs are available at:');
		for (const artifact of summary.artifacts) {
			console.log(`     - ${artifact}`);
		}
	}
}

function logStep(message) {
	console.log(`\n>> ${message}`);
}

function logSuccess(summary) {
	console.log('\nSUCCESS Smoke test succeeded.');
	if (summary.projects.length > 0) {
		console.log('   Workspaces:');
		for (const project of summary.projects) {
			console.log(
				`     - [${project.packageManager}] ${project.dir}`
			);
		}
	} else {
		console.log(`   Project workspace: ${summary.projectDir}`);
	}
	console.log('   Tarballs:');
	for (const artifact of summary.artifacts) {
		console.log(`     - ${artifact}`);
	}
	console.log(
		'\nRe-run readiness manually with:\n' +
		`  cd ${summary.projects[0]?.dir ?? summary.projectDir}\n` +
		'  wpk doctor --plan quickstart\n\n' +
		'Or regenerate:\n' +
		`  cd ${summary.projects[0]?.dir ?? summary.projectDir}\n` +
		'  wpk generate\n\n' +
		'Or apply immediately:\n' +
		`  cd ${summary.projects[0]?.dir ?? summary.projectDir}\n` +
		'  wpk apply --yes\n'
	);
}

async function packWorkspace(workspaceName) {
	const { stdout } = await runPnpm(
		['--filter', workspaceName, 'pack', '--pack-destination', artifactsDir],
		{
			cwd: repoRoot,
			capture: true,
			quietCapture: true,
			env: {
				...process.env,
				PNPM_LOG_LEVEL: 'silent',
			},
		}
	);

	const tarballPath = extractTarballFromStdout(stdout);
	if (tarballPath) {
		return tarballPath;
	}

	const candidates = (await readdir(artifactsDir)).filter((file) =>
		file.endsWith('.tgz')
	);

	if (candidates.length === 0) {
		throw new Error(`pnpm pack produced no tarball for ${workspaceName}`);
	}

	const withTime = await Promise.all(
		candidates.map(async (file) => {
			const filePath = path.join(artifactsDir, file);
			const fileStat = await stat(filePath);
			return { filePath, mtime: fileStat.mtimeMs };
		})
	);

	withTime.sort((a, b) => b.mtime - a.mtime);
	return withTime[0]?.filePath ?? path.join(artifactsDir, candidates[0]);
}

async function runPnpm(args, options = {}) {
	return runCommand('pnpm', args, options);
}

async function runNode(scriptPath, args = [], options = {}) {
	return runCommand(process.execPath, [scriptPath, ...args], options);
}

function runCommand(command, args, options = {}) {
	const {
		cwd = repoRoot,
		env = process.env,
		capture = false,
		quietCapture = false,
	} = options;

	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env,
			stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
		});
		let stdout = '';

		if (capture && child.stdout) {
			child.stdout.on('data', (chunk) => {
				const value = chunk.toString();
				stdout += value;
				if (!quietCapture) {
					process.stdout.write(value);
				}
			});
		}

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code, signal) => {
			if (code === 0) {
				resolve(capture ? { stdout } : {});
				return;
			}

			const reason =
				typeof code === 'number'
					? `exit code ${code}`
					: signal
						? `signal ${signal}`
						: 'unknown failure';
			reject(
				new Error(
					`Command "${command} ${args.join(' ')}" failed with ${reason}`
				)
			);
		});
	});
}

function extractTarballFromStdout(stdout = '') {
	const lines = stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.reverse();

	for (const line of lines) {
		if (line.endsWith('.tgz')) {
			return path.isAbsolute(line)
				? line
				: path.join(artifactsDir, line);
		}
	}

	return undefined;
}

main().catch((error) => {
	console.error('\nERROR Smoke test failed.');
	console.error(error);
	process.exitCode = 1;
});

function parsePackageManagers(args) {
	const entry = args.find((arg) =>
		arg.startsWith('--package-managers=')
	);
	const supported = ['npm', 'pnpm', 'yarn'];

	if (!entry) {
		return ['npm'];
	}

	const [, value = ''] = entry.split('=');
	const candidates = value
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter((item) => item.length > 0);

	if (candidates.length === 0) {
		return ['npm'];
	}

	if (candidates.includes('all')) {
		return supported;
	}

	const invalid = candidates.filter(
		(candidate) => !supported.includes(candidate)
	);
	if (invalid.length > 0) {
		throw new Error(
			`Unsupported package managers: ${invalid.join(', ')}. Expected one of ${supported.join(', ')} or "all".`
		);
	}

	return Array.from(new Set(candidates));
}
