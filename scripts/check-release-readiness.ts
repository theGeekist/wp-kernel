#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

type PackageScripts = Record<string, string | undefined>;

interface PackageJson {
	readonly name?: string;
	readonly version?: string;
	readonly private?: boolean;
	readonly scripts?: PackageScripts;
}

const REQUIRED_SCRIPTS: readonly string[] = [
	'build',
	'typecheck',
	'typecheck:tests',
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function readJsonFile<T>(filePath: string): T {
	const contents = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(contents) as T;
}

function gatherWorkspacePackageJsonFiles(): readonly string[] {
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

function isPublishablePackage(
	manifest: PackageJson
): manifest is Required<Pick<PackageJson, 'name'>> {
	return manifest.private !== true && typeof manifest.name === 'string';
}

function collectScriptErrors(
	name: string,
	scripts: PackageScripts | undefined
): string[] {
	const packageScripts = scripts ?? {};

	return REQUIRED_SCRIPTS.reduce<string[]>((errors, scriptName) => {
		if (!packageScripts[scriptName]) {
			errors.push(`${name} is missing the \"${scriptName}\" script.`);
		}
		return errors;
	}, []);
}

function collectVersionErrors(
	name: string,
	version: string | undefined,
	rootVersion: string
): string[] {
	if (!version) {
		return [`${name} does not declare a version.`];
	}

	if (version !== rootVersion) {
		return [
			`${name} declares version ${version} (expected ${rootVersion}).`,
		];
	}

	return [];
}

function main(): void {
	const rootPackagePath = path.join(REPO_ROOT, 'package.json');
	const rootManifest = readJsonFile<PackageJson>(rootPackagePath);
	const rootVersion = rootManifest.version;

	if (!rootVersion) {
		console.error('Root package.json is missing a version.');
		process.exit(1);
	}

	const packageJsonFiles = gatherWorkspacePackageJsonFiles();
	const errors: string[] = [];

	for (const filePath of packageJsonFiles) {
		const manifest = readJsonFile<PackageJson>(filePath);
		if (!isPublishablePackage(manifest)) {
			continue;
		}

		const name = manifest.name;
		errors.push(
			...collectVersionErrors(name, manifest.version, rootVersion),
			...collectScriptErrors(name, manifest.scripts)
		);
	}

	if (errors.length > 0) {
		console.error('Release readiness check failed:');
		for (const message of errors) {
			console.error(` - ${message}`);
		}
		process.exit(1);
	}

	console.log(
		`All publishable workspaces share version ${rootVersion} and expose the required build scripts.`
	);
}

main();
