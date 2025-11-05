/**
 * Generate per-package TypeDoc API documentation.
 *
 * Generates TypeDoc output for each @wpkernel/* package into separate
 * docs/api/<package-name>/ folders. Uses the shared typedoc.json config
 * and tsconfig.docs.json.
 *
 * Usage: node scripts/docs/generate-api.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..', '..');
const pkgsDir = path.join(repo, 'packages');

function listPackages() {
	const items = fs.readdirSync(pkgsDir, { withFileTypes: true });
	const result = [];
	for (const d of items) {
		if (!d.isDirectory()) continue;
		const pkgRoot = path.join(pkgsDir, d.name);
		const pkgJson = path.join(pkgRoot, 'package.json');
		if (!fs.existsSync(pkgJson)) continue;
		const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
		if (!pkg.name || !pkg.name.startsWith('@wpkernel/')) continue;

		// prefer src/index.ts as entry (skip if missing)
		const entry = path.join(pkgRoot, 'src', 'index.ts');
		if (!fs.existsSync(entry)) continue;

		result.push({ name: pkg.name, entry });
	}
	return result;
}

function typedocBin() {
	const bin = path.join(repo, 'node_modules', '.bin', 'typedoc');
	return fs.existsSync(bin) ? bin : 'typedoc';
}

const optionsFile = path.join(repo, 'typedoc.json');
const tsconfigFile = path.join(repo, 'tsconfig.docs.json');

const pkgs = listPackages();
if (pkgs.length === 0) {
	console.error('No @wpkernel/* packages with src/index.ts found.');
	process.exit(1);
}

console.log(`\n📚 Generating TypeDoc for ${pkgs.length} packages...\n`);

for (const { name, entry } of pkgs) {
	const outDir = path.join(repo, 'docs', 'api', name);
	fs.mkdirSync(outDir, { recursive: true });
	console.log(`→ Generating ${name} → ${path.relative(repo, outDir)}`);

	const args = [
		'--options',
		optionsFile,
		'--tsconfig',
		tsconfigFile,
		'--out',
		outDir,
		'--entryPoints',
		entry,
	];

	try {
		execFileSync(typedocBin(), args, { stdio: 'inherit', cwd: repo });
	} catch (error) {
		console.error(`❌ Failed to generate docs for ${name}`);
		throw error;
	}
}

console.log('\n✅ TypeDoc generation complete.');
