#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

function assert(condition, message) {
	if (!condition) {
		console.error(message);
		process.exit(1);
	}
}

function readJsonFile(filePath) {
	const contents = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(contents);
}

function writeJsonFile(filePath, data) {
	const contents = `${JSON.stringify(data, null, '\t')}\n`;
	fs.writeFileSync(filePath, contents);
}

function updatePackageVersion(filePath, currentVersion, nextVersion) {
	const manifest = readJsonFile(filePath);
	if (typeof manifest.version !== 'string') {
		return false;
	}

	assert(
		manifest.version === currentVersion,
		`Version mismatch in ${filePath}. Expected ${currentVersion}, found ${manifest.version}.`
	);

	manifest.version = nextVersion;
	writeJsonFile(filePath, manifest);
	return true;
}

function updateRoadmapVersion(filePath, currentVersion, nextVersion) {
	const contents = fs.readFileSync(filePath, 'utf8');
	const currentToken = `**Latest Release**: v${currentVersion}`;
	if (!contents.includes(currentToken)) {
		return false;
	}

	const nextToken = `**Latest Release**: v${nextVersion}`;
	fs.writeFileSync(filePath, contents.replace(currentToken, nextToken));
	return true;
}

function gatherWorkspacePackageJsonFiles(repoRoot) {
	const manifestGlobs = [
		path.join(repoRoot, 'packages'),
		path.join(repoRoot, 'examples'),
	];

	const files = [];
	for (const basePath of manifestGlobs) {
		if (!fs.existsSync(basePath)) {
			continue;
		}

		const entries = fs.readdirSync(basePath, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const manifestPath = path.join(
				basePath,
				entry.name,
				'package.json'
			);
			if (fs.existsSync(manifestPath)) {
				files.push(manifestPath);
			}
		}
	}

	return files;
}

function runDocsBuild(repoRoot) {
	const result = spawnSync('pnpm', ['docs:build'], {
		cwd: repoRoot,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function main() {
	const [, , nextVersion] = process.argv;
	assert(
		nextVersion,
		'Usage: node scripts/release/bump-version.mjs <new-version>'
	);
	assert(
		SEMVER_PATTERN.test(nextVersion),
		`Invalid semver version: ${nextVersion}`
	);

	const currentFilePath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(currentFilePath), '..', '..');
	const rootManifestPath = path.join(repoRoot, 'package.json');
	const rootManifest = readJsonFile(rootManifestPath);
	assert(
		typeof rootManifest.version === 'string',
		'Root package.json is missing a version.'
	);

	const currentVersion = rootManifest.version;
	assert(
		currentVersion !== nextVersion,
		`Version ${currentVersion} is already set.`
	);

	const updatedFiles: string[] = [];
	if (updatePackageVersion(rootManifestPath, currentVersion, nextVersion)) {
		updatedFiles.push(path.relative(repoRoot, rootManifestPath));
	}

	const workspaceManifests = gatherWorkspacePackageJsonFiles(repoRoot);
	for (const manifestPath of workspaceManifests) {
		if (updatePackageVersion(manifestPath, currentVersion, nextVersion)) {
			updatedFiles.push(path.relative(repoRoot, manifestPath));
		}
	}

	const roadmapPath = path.join(
		repoRoot,
		'docs',
		'contributing',
		'roadmap.md'
	);
	if (
		fs.existsSync(roadmapPath) &&
		updateRoadmapVersion(roadmapPath, currentVersion, nextVersion)
	) {
		updatedFiles.push(path.relative(repoRoot, roadmapPath));
	}

	console.log('Updated versions in:');
	for (const file of updatedFiles) {
		console.log(` - ${file}`);
	}

	console.log('\nRebuilding documentation...');
	runDocsBuild(repoRoot);
	console.log('Documentation rebuild complete.');
}

main();
