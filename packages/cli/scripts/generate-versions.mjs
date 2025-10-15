import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
	const cliRoot = path.resolve(__dirname, '..');
	const corePackagePath = path.resolve(cliRoot, '..', 'core', 'package.json');
	const manifestDir = path.join(cliRoot, 'dist', 'cli');
	const manifestPath = path.join(manifestDir, 'versions.json');

	const raw = await fs.readFile(corePackagePath, 'utf8');
	const corePackage = JSON.parse(raw);
	const peers = sortDependencies(
		typeof corePackage?.peerDependencies === 'object' &&
			corePackage.peerDependencies !== null
			? corePackage.peerDependencies
			: {}
	);

	const manifest = {
		coreVersion:
			typeof corePackage?.version === 'string' ? corePackage.version : '',
		generatedAt: new Date().toISOString(),
		peers,
	};

	await fs.mkdir(manifestDir, { recursive: true });
	await fs.writeFile(
		manifestPath,
		`${JSON.stringify(manifest, null, 2)}\n`,
		'utf8'
	);
}

function sortDependencies(map) {
	if (!map || typeof map !== 'object') {
		return {};
	}

	return Object.fromEntries(
		Object.entries(map)
			.filter(([, version]) => typeof version === 'string')
			.sort(([a], [b]) => a.localeCompare(b))
	);
}

main().catch((error) => {
	console.error('[wpk] Failed to generate versions manifest', error);
	process.exitCode = 1;
});
