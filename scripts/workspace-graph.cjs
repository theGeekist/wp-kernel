const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(
	repoRoot,
	'node_modules',
	'.cache',
	'wpkernel',
	'workspace-graph.json'
);
const LEGACY_PATH = path.join(repoRoot, 'scripts', 'workspace-graph.json');
const BUILD_SCRIPT = path.join(
	repoRoot,
	'scripts',
	'build-workspace-graph.mjs'
);

function normalizeDir(dir = '') {
	const forward = dir.replace(/\\/g, '/');
	if (forward === '') {
		return forward;
	}
	return forward.endsWith('/') ? forward : `${forward}/`;
}

function readGraphFrom(filePath) {
	try {
		const raw = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function regenerateGraph() {
	const result = spawnSync('node', [BUILD_SCRIPT], {
		cwd: repoRoot,
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		throw new Error(
			`Failed to build workspace graph (exit code ${result.status ?? 'unknown'})`
		);
	}
}

function normalizeWorkspaceEntry(ws) {
	const dir = normalizeDir(ws.dir);
	const packageJsonPath =
		ws.packageJsonPath && path.isAbsolute(ws.packageJsonPath)
			? ws.packageJsonPath
			: path.join(repoRoot, dir, 'package.json');
	return {
		...ws,
		dir,
		packageJsonPath,
	};
}

function normalizeGraph(graph) {
	return {
		...graph,
		root: repoRoot,
		workspaces: (graph?.workspaces ?? []).map(normalizeWorkspaceEntry),
	};
}

function loadWorkspaceGraph(options = {}) {
	const { allowRegenerate = true } = options;
	const graph = readGraphFrom(CACHE_PATH) ?? readGraphFrom(LEGACY_PATH);
	if (graph) {
		return normalizeGraph(graph);
	}
	if (!allowRegenerate) {
		throw new Error(
			'Unable to load workspace graph. Run `node scripts/build-workspace-graph.mjs` to regenerate it.'
		);
	}
	regenerateGraph();
	return loadWorkspaceGraph({ allowRegenerate: false });
}

function getWorkspaceByName(graph, name) {
	return (graph?.workspaces ?? []).find((ws) => ws.name === name) ?? null;
}

function getWorkspaceDependencies(graph, name) {
	const ws = getWorkspaceByName(graph, name);
	return ws?.localDeps ? [...ws.localDeps] : [];
}

function getWorkspaceDependents(graph, name) {
	const ws = getWorkspaceByName(graph, name);
	return ws?.localDependents ? [...ws.localDependents] : [];
}

function findWorkspaceForFile(graph, filePath) {
	if (!graph) {
		return null;
	}
	const root = graph.root ? path.resolve(graph.root) : repoRoot;
	const absolute = path.isAbsolute(filePath)
		? path.resolve(filePath)
		: path.resolve(root, filePath);
	const relative = path.relative(root, absolute).replace(/\\/g, '/');
	if (relative.startsWith('..')) {
		return null;
	}
	for (const ws of graph.workspaces ?? []) {
		const dir = normalizeDir(ws.dir);
		if (dir && relative.startsWith(dir)) {
			return ws;
		}
	}
	return null;
}

module.exports = {
	loadWorkspaceGraph,
	getWorkspaceByName,
	getWorkspaceDependencies,
	getWorkspaceDependents,
	findWorkspaceForFile,
};
