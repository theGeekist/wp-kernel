#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { FRAMEWORK_PEERS } from './config/framework-peers.mjs';

const REQUIRED_PEERS = {
	'@wpkernel/cli': [
		'@wpkernel/core',
		'@wpkernel/php-json-ast',
		'@wpkernel/ui',
	],
	'@wpkernel/core': [
		'@wordpress/api-fetch',
		'@wordpress/data',
		'@wordpress/element',
		'@wordpress/hooks',
		'@wordpress/interactivity',
	],
	'@wpkernel/e2e-utils': ['@wpkernel/core'],
	'@wpkernel/php-driver': ['@wpkernel/core'],
	'@wpkernel/php-json-ast': ['@wpkernel/core'],
	'@wpkernel/test-utils': ['@wpkernel/core', '@wpkernel/ui', 'react'],
	'@wpkernel/ui': [
		'@wpkernel/core',
		'@wordpress/components',
		'@wordpress/data',
		'@wordpress/dataviews',
		'@wordpress/element',
		'react',
	],
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function readJsonFile(filePath) {
	const raw = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(raw);
}

function gatherWorkspacePackages() {
	const packagesDir = path.join(REPO_ROOT, 'packages');
	if (!fs.existsSync(packagesDir)) {
		return [];
	}

	return fs
		.readdirSync(packagesDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(packagesDir, entry.name, 'package.json'))
		.filter((filePath) => fs.existsSync(filePath));
}

function ensureRootDevDependencies(rootPackage) {
	const errors = [];
	const devDependencies = rootPackage.devDependencies ?? {};

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		if (!Object.prototype.hasOwnProperty.call(spec, 'devRange')) {
			continue;
		}

		if (!spec.devRange) {
			continue;
		}

		const current = devDependencies[dependency];
		if (!current) {
			errors.push(
				`Root package.json is missing devDependency "${dependency}" (expected ${spec.devRange}).`
			);
			continue;
		}

		if (current !== spec.devRange) {
			errors.push(
				`Root devDependency "${dependency}" is "${current}" (expected ${spec.devRange}).`
			);
		}
	}

	return errors;
}

function collectRequiredPeerErrors(packageName, peerDependencies) {
	const requiredPeers = REQUIRED_PEERS[packageName] ?? [];

	return requiredPeers
		.filter((dependency) => !peerDependencies[dependency])
		.map(
			(dependency) =>
				`${packageName} is missing required peer dependency "${dependency}".`
		);
}

function collectPeerRangeErrors(packageName, peerDependencies) {
	const errors = [];

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		const peerRange = peerDependencies[dependency];
		if (peerRange && peerRange !== spec.peerRange) {
			errors.push(
				`${packageName} declares peer dependency "${dependency}" as "${peerRange}" (expected ${spec.peerRange}).`
			);
		}
	}

	return errors;
}

function collectDependencyPlacementErrors(packageName, dependencies) {
	const errors = [];

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		const dependencyRange = dependencies[dependency];
		if (!dependencyRange) {
			continue;
		}

		// Allow 'tooling' kind dependencies to be in dependencies (they're lazy-loaded)
		if (spec.kind !== 'internal' && spec.kind !== 'tooling') {
			errors.push(
				`${packageName} lists "${dependency}" under dependencies; move it to peerDependencies to keep the package external.`
			);
			continue;
		}

		// Internal workspace packages must use workspace:*
		if (spec.kind === 'internal' && dependencyRange !== 'workspace:*') {
			errors.push(
				`${packageName} lists internal dependency "${dependency}" as "${dependencyRange}" (expected workspace:*).`
			);
		}

		// Tooling packages can use regular semver ranges
		// No validation needed for tooling kind
	}

	return errors;
}

function collectDevDependencyErrors(packageName, devDependencies) {
	const errors = [];

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		const devRange = devDependencies[dependency];
		if (!devRange) {
			continue;
		}

		const hasDevRange =
			Object.prototype.hasOwnProperty.call(spec, 'devRange') &&
			typeof spec.devRange === 'string' &&
			spec.devRange.length > 0;

		if (!hasDevRange) {
			errors.push(
				`${packageName} declares devDependency "${dependency}" but the shared capability does not define a version. Add a capability entry or remove the devDependency.`
			);
			continue;
		}

		if (devRange !== spec.devRange) {
			errors.push(
				`${packageName} declares devDependency "${dependency}" as "${devRange}" (expected ${spec.devRange}).`
			);
		}
	}

	return errors;
}

function ensurePeerCapability(packageJson, packagePath) {
	const packageName = packageJson.name ?? packagePath;
	const peerDependencies = packageJson.peerDependencies ?? {};
	const dependencies = packageJson.dependencies ?? {};
	const devDependencies = packageJson.devDependencies ?? {};

	return [
		...collectRequiredPeerErrors(packageName, peerDependencies),
		...collectPeerRangeErrors(packageName, peerDependencies),
		...collectDependencyPlacementErrors(packageName, dependencies),
		...collectDevDependencyErrors(packageName, devDependencies),
	];
}

function main() {
	const errors = [];
	const rootPackage = readJsonFile(path.join(REPO_ROOT, 'package.json'));

	errors.push(...ensureRootDevDependencies(rootPackage));

	const workspacePackages = gatherWorkspacePackages();
	for (const packageJsonPath of workspacePackages) {
		const packageJson = readJsonFile(packageJsonPath);
		errors.push(...ensurePeerCapability(packageJson, packageJsonPath));
	}

	if (errors.length > 0) {
		errors.forEach((message) => console.error(`\u274c ${message}`));
		console.error(
			`\nFound ${errors.length} framework peer dependency issue(s).`
		);
		process.exitCode = 1;
		return;
	}

	console.log('✅ Framework peer dependency capability is satisfied.');
}

main();
