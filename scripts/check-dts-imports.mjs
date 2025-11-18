#!/usr/bin/env node

/**
 * Ensures emitted .d.ts files do not reference internal source paths such as
 * ../../../core/src/*. Rewrites to package entry points when --fix is passed;
 * otherwise fails with a list of offending files.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';

const PACKAGES = [
	'core',
	'cli',
	'pipeline',
	'php-json-ast',
	'ui',
	'wp-json-ast',
];

const mode = process.argv.includes('--fix') ? 'fix' : 'check';
const distGlobs = ['packages/*/dist/**/*.d.ts'];
const offenders = [];

const importPattern = new RegExp(
	`(['"])(?:\\.\\./)+(?:packages\\/)?(${PACKAGES.join(
		'|'
	)})(?:\\/src\\/([^'"]+)|\\/dist\\/index\\.d\\.ts)\\1`,
	'g'
);

function toPackageImport(pkg, rest = 'index') {
	const cleaned = rest
		.replace(/\\/g, '/')
		.replace(/^\/dist\/index\.d\.ts$/, 'index')
		.replace(/(\.d)?\.ts$/, '')
		.replace(/\.js$/, '');

	if (cleaned === 'index') {
		return `@wpkernel/${pkg}`;
	}

	return `@wpkernel/${pkg}/${cleaned}`;
}

async function processFile(file) {
	const contents = await fs.readFile(file, 'utf8');
	let mutated = contents;
	let changed = false;

	// Normalize references to package sources or dist/index.d.ts
	mutated = mutated.replace(importPattern, (match, quote, pkg, rest) => {
		changed = true;
		return `${quote}${toPackageImport(pkg, rest)}${quote}`;
	});

	// Ensure imports of .d.ts files are type-only and point at .js to satisfy TS2846
	const dtsImportPattern =
		/import\s+(type\s+)?([^'"]+?)\s+from\s+(['"])([^'"]+)\.d\.ts\3/g;
	mutated = mutated.replace(
		dtsImportPattern,
		(_match, typePrefix, bindings, quote, specifier) => {
			changed = true;
			return `import type ${bindings.trim()} from ${quote}${specifier}.js${quote}`;
		}
	);

	if (changed) {
		if (mode === 'fix') {
			await fs.writeFile(file, mutated, 'utf8');
		} else {
			offenders.push(file);
		}
	}
}

async function main() {
	const files = await glob(distGlobs, { posix: true });

	await Promise.all(files.map(processFile));

	if (mode === 'check' && offenders.length > 0) {
		console.error(
			`Found ${offenders.length} .d.ts files importing package sources via ../src:\n` +
				offenders.map((f) => ` - ${path.posix.normalize(f)}`).join('\n')
		);
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
