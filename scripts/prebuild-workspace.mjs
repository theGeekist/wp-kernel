#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { loadWorkspaceGraph } from './precommit-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
if (process.cwd() !== repoRoot) {
	process.chdir(repoRoot);
}

function parseArgs(argv) {
	const targets = [];
	const extras = [];
	for (let idx = 0; idx < argv.length; idx += 1) {
		const arg = argv[idx];
		if (arg === '--also') {
			const next = argv[idx + 1];
			if (!next || next.startsWith('-')) {
				throw new Error('--also requires a package name argument');
			}
			extras.push(next);
			idx += 1;
			continue;
		}
		if (arg.startsWith('-')) {
			throw new Error(`Unknown flag "${arg}"`);
		}
		targets.push(arg);
	}
	return { targets, extras };
}

async function runCommand(command, args, options = {}) {
	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			cwd: options.cwd ?? repoRoot,
			env: { ...process.env, ...options.env },
		});
		child.on('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			const reason =
				code !== null
					? `exit code ${code}`
					: `signal ${signal ?? '<unknown>'}`;
			reject(new Error(`${command} ${args.join(' ')} failed (${reason})`));
		});
		child.on('error', (error) => reject(error));
	});
}

async function ensureWorkspaceGraph() {
	try {
		return await loadWorkspaceGraph();
	} catch (error) {
		console.warn(
			`prebuild: unable to load workspace graph (${error.message}). Regenerating…`
		);
		await runCommand('node', [path.join('scripts', 'build-workspace-graph.mjs')]);
		return await loadWorkspaceGraph();
	}
}

async function readPackageJson(workspace) {
	if (!workspace?.packageJsonPath) {
		return null;
	}
	const raw = await readFile(workspace.packageJsonPath, 'utf8');
	return JSON.parse(raw);
}

async function main() {
	const { targets, extras } = parseArgs(process.argv.slice(2));
	if (targets.length === 0 && extras.length === 0) {
		console.error(
			'Usage: node scripts/prebuild-workspace.mjs <workspace> [--also <workspace> ...]'
		);
		process.exit(1);
	}

	const graph = await ensureWorkspaceGraph();
	const workspaceByName = new Map();
	for (const ws of graph.workspaces ?? []) {
		workspaceByName.set(ws.name, ws);
	}

	const packageJsonCache = new Map();
	const dependencyCache = new Map();

	async function getPackageJson(name) {
		if (packageJsonCache.has(name)) {
			return packageJsonCache.get(name);
		}
		const workspace = workspaceByName.get(name);
		if (!workspace) {
			return null;
		}
		const json = await readPackageJson(workspace);
		packageJsonCache.set(name, json);
		return json;
	}

	async function getWorkspaceDeps(name) {
		if (dependencyCache.has(name)) {
			return dependencyCache.get(name);
		}
		const pkg = await getPackageJson(name);
		if (!pkg || typeof pkg !== 'object') {
			dependencyCache.set(name, []);
			return [];
		}
		const deps = pkg.dependencies ?? {};
		const local = Object.keys(deps).filter((dep) => workspaceByName.has(dep));
		dependencyCache.set(name, local);
		return local;
	}

	const visiting = new Set();
	const visited = new Set();
	const order = [];
	const missingWorkspaces = new Set();

	async function dfs(name) {
		if (visited.has(name)) {
			return;
		}
		if (visiting.has(name)) {
			console.warn(
				`prebuild: detected cyclic dependency involving "${name}", skipping recursive resolution.`
			);
			return;
		}
		if (!workspaceByName.has(name)) {
			missingWorkspaces.add(name);
			return;
		}
		visiting.add(name);
		const deps = await getWorkspaceDeps(name);
		for (const dep of deps) {
			await dfs(dep);
		}
		visiting.delete(name);
		visited.add(name);
		order.push(name);
	}

	for (const name of [...targets, ...extras]) {
		await dfs(name);
	}

	if (missingWorkspaces.size > 0) {
		for (const missing of missingWorkspaces) {
			console.warn(
				`prebuild: workspace "${missing}" was requested but is not part of the current graph.`
			);
		}
	}

	if (order.length === 0) {
		console.log('prebuild: no workspaces to build.');
		return;
	}

	const skip = new Set(targets);
	const uniqueOrder = order.filter(
		(name, index) => order.indexOf(name) === index
	);

	const buildList = uniqueOrder.filter((name) => !skip.has(name));

	const packagesToBuild = [];
	for (const name of buildList) {
		const pkg = await getPackageJson(name);
		if (!pkg) continue;
		if (!pkg.scripts || typeof pkg.scripts.build !== 'string') {
			continue;
		}
		packagesToBuild.push(name);
	}

	if (packagesToBuild.length === 0) {
		console.log('prebuild: nothing required compiling.');
		return;
	}

	for (const name of packagesToBuild) {
		console.log(`prebuild: building ${name}`);
		await runCommand('pnpm', ['--filter', name, 'build']);
	}
}

main().catch((error) => {
	console.error('prebuild: failed to build workspace dependencies:', error);
	process.exitCode = 1;
});
