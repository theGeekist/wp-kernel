#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find repo root by:
 * 1. WPKERNEL_REPO_ROOT
 * 2. INIT_CWD
 * 3. walking up from cwd until we find pnpm-workspace.yaml
 */
function findRepoRoot() {
	const candidates = [
		process.env.WPKERNEL_REPO_ROOT,
		process.env.INIT_CWD,
		process.cwd(),
	].filter(Boolean);

	const SENTINEL = 'pnpm-workspace.yaml';

	const isRoot = (dir) =>
		Boolean(dir) && fssync.existsSync(path.join(dir, SENTINEL));

	for (const candidate of candidates) {
		if (isRoot(candidate)) {
			return path.resolve(candidate);
		}
	}

	// walk up
	let current = process.cwd();
	const { root } = path.parse(current);
	while (true) {
		if (isRoot(current)) {
			return current;
		}
		if (current === root) break;
		current = path.dirname(current);
	}

	// fallback: current dir
	return process.cwd();
}

const REPO_ROOT = findRepoRoot();

// we now write into node_modules cache so git never sees it
const CACHE_DIR = path.join(
	REPO_ROOT,
	'node_modules',
	'.cache',
	'wpkernel',
);
const OUTPUT_PATH = path.join(CACHE_DIR, 'workspace-graph.json');

// if we can't read pnpm-workspace.yaml, we'll look here:
const FALLBACK_DIRS = ['packages', 'examples', 'tools', 'apps'];

/**
 * Super tiny "parser" for pnpm-workspace.yaml that only cares about:
 *
 * packages:
 *   - "packages/*"
 *   - "examples/*"
 */
async function readPnpmWorkspaceGlobs() {
	const wsPath = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
	if (!fssync.existsSync(wsPath)) {
		return null;
	}
	const raw = await fs.readFile(wsPath, 'utf8');
	const lines = raw.split(/\r?\n/);
	const globs = [];
	let inPackages = false;
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('packages:')) {
			inPackages = true;
			continue;
		}
		if (!inPackages) continue;
		// next top-level key => stop
		if (/^[a-zA-Z0-9_-]+:/.test(trimmed)) {
			break;
		}
		const m = trimmed.match(/^-\s*["']?(.*?)["']?$/);
		if (m) {
			globs.push(m[1]);
		}
	}
	return globs.length > 0 ? globs : null;
}

/**
 * Expand a very small subset of pnpm glob patterns: "dir/*"
 */
async function expandSimpleGlob(pattern) {
	// only support foo/* style. if not, treat as dir and list
	if (!pattern.endsWith('/*')) {
		const abs = path.join(REPO_ROOT, pattern);
		if (fssync.existsSync(abs) && fssync.lstatSync(abs).isDirectory()) {
			const entries = await fs.readdir(abs, { withFileTypes: true });
			return entries
				.filter((e) => e.isDirectory())
				.map((e) => path.join(pattern, e.name));
		}
		return [];
	}
	const base = pattern.slice(0, -2); // remove /*
	const absBase = path.join(REPO_ROOT, base);
	if (!fssync.existsSync(absBase)) return [];
	const entries = await fs.readdir(absBase, { withFileTypes: true });
	return entries
		.filter((e) => e.isDirectory())
		.map((e) => path.join(base, e.name));
}

async function discoverWorkspaceDirs() {
	const fromYaml = await readPnpmWorkspaceGlobs();
	if (fromYaml && fromYaml.length > 0) {
		const dirs = [];
		for (const patt of fromYaml) {
			const expanded = await expandSimpleGlob(patt);
			dirs.push(...expanded);
		}
		return Array.from(new Set(dirs));
	}

	// fallback: packages/, examples/, tools/, apps/
	const dirs = [];
	for (const base of FALLBACK_DIRS) {
		const abs = path.join(REPO_ROOT, base);
		if (!fssync.existsSync(abs)) continue;
		const entries = await fs.readdir(abs, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			dirs.push(path.join(base, entry.name));
		}
	}
	return dirs;
}

async function readPackageJson(dirRel) {
	const pkgPath = path.join(REPO_ROOT, dirRel, 'package.json');
	try {
		const raw = await fs.readFile(pkgPath, 'utf8');
		const stat = await fs.stat(pkgPath);
		return {
			ok: true,
			data: JSON.parse(raw),
			mtimeMs: stat.mtimeMs,
			path: pkgPath,
		};
	} catch (err) {
		return { ok: false, error: err, path: pkgPath };
	}
}

function collectDepNames(pkg) {
	const acc = new Set();
	const sections = [
		'dependencies',
		'devDependencies',
		'peerDependencies',
		'optionalDependencies',
	];
	for (const sec of sections) {
		const deps = pkg[sec];
		if (!deps) continue;
		for (const name of Object.keys(deps)) {
			acc.add(name);
		}
	}
	return Array.from(acc);
}

function normalizeDir(dirRel) {
	if (!dirRel) {
		return '';
	}
	const forward = dirRel.replace(/\\/g, '/');
	return forward.endsWith('/') ? forward : `${forward}/`;
}

async function main() {
	const dirs = await discoverWorkspaceDirs();

	// 1. read all package.json
	const workspaces = [];
	for (const dirRel of dirs) {
		const pkg = await readPackageJson(dirRel);
		if (!pkg.ok) {
			continue;
		}
		const name = pkg.data.name;
		if (!name) {
			continue;
		}
		const normalizedDir = normalizeDir(dirRel);
		workspaces.push({
			name,
			dir: normalizedDir,
			packageJsonPath: `${normalizedDir}package.json`,
			packageJsonMtimeMs: pkg.mtimeMs,
			raw: pkg.data,
		});
	}

	// 2. index by name
	const nameToIndex = new Map();
	workspaces.forEach((ws, idx) => {
		nameToIndex.set(ws.name, idx);
	});

	// 3. build localDeps
	for (const ws of workspaces) {
		const depNames = collectDepNames(ws.raw);
		ws.localDeps = depNames.filter((dep) => nameToIndex.has(dep));
	}

	// 4. build reverse deps
	for (const ws of workspaces) {
		ws.localDependents = [];
	}
	for (const ws of workspaces) {
		for (const depName of ws.localDeps) {
			const depIdx = nameToIndex.get(depName);
			if (typeof depIdx !== 'number') continue;
			const depWs = workspaces[depIdx];
			depWs.localDependents.push(ws.name);
		}
	}

	// 5. build edges (nice for debugging / visualising)
	const edges = [];
	for (const ws of workspaces) {
		for (const dep of ws.localDeps) {
			edges.push({ from: ws.name, to: dep });
		}
	}

	// ensure cache dir
	await fs.mkdir(CACHE_DIR, { recursive: true });

	const out = {
		generatedAt: new Date().toISOString(),
		root: '.',
		workspaces: workspaces.map((ws) => ({
			name: ws.name,
			dir: ws.dir,
			packageJsonPath: ws.packageJsonPath,
			packageJsonMtimeMs: ws.packageJsonMtimeMs,
			localDeps: ws.localDeps,
			localDependents: ws.localDependents,
		})),
		edges,
	};

	await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

	console.log(
		`wpkernel: wrote workspace graph for ${workspaces.length} workspaces → ${path.relative(
			REPO_ROOT,
			OUTPUT_PATH,
		)}`,
	);
}

main().catch((err) => {
	console.error('Failed to build workspace graph:', err);
	process.exitCode = 1;
});
