import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = async (command, args, options) =>
	new Promise((resolve, reject) => {
		execFile(command, args, options, (error, stdout, stderr) => {
			if (error) {
				const enrichedError = new Error(
					`${command} ${args.join(' ')} failed: ${stderr || error.message}`
				);
				enrichedError.cause = error;
				reject(enrichedError);
				return;
			}

			resolve({ stdout, stderr });
		});
	});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGES = [
	path.join(ROOT, 'packages', 'cli'),
	path.join(ROOT, 'packages', 'php-json-ast'),
];

async function hasFile(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if (error?.code === 'ENOENT') {
			return false;
		}
		throw error;
	}
}

async function ensureComposerDependencies(packageRoot) {
	const vendorAutoload = path.join(packageRoot, 'vendor', 'autoload.php');
	const composerManifest = path.join(packageRoot, 'composer.json');

	if (await hasFile(vendorAutoload)) {
		return;
	}

	if (!(await hasFile(composerManifest))) {
		throw new Error(
			`Expected composer manifest at ${composerManifest}, but it was not found.`
		);
	}

	const composerArgs = ['install', '--no-interaction', '--no-progress'];
	await execFileAsync('composer', composerArgs, { cwd: packageRoot });

	if (!(await hasFile(vendorAutoload))) {
		throw new Error(
			`Composer install completed but autoload.php is still missing at ${vendorAutoload}.`
		);
	}
}

export default async function globalSetup() {
	for (const pkg of PACKAGES) {
		await ensureComposerDependencies(pkg);
	}
}
