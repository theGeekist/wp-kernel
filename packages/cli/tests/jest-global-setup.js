import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = async (command, args, options) =>
	await new Promise((resolve, reject) => {
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
const CLI_ROOT = path.resolve(__dirname, '..');
const VENDOR_AUTOLOAD = path.resolve(CLI_ROOT, 'vendor', 'autoload.php');
const COMPOSER_MANIFEST = path.resolve(CLI_ROOT, 'composer.json');

async function hasFile(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'ENOENT'
		) {
			return false;
		}

		throw error;
	}
}

async function ensureComposerDependencies() {
	const hasAutoload = await hasFile(VENDOR_AUTOLOAD);
	if (hasAutoload) {
		return;
	}

	const hasComposerManifest = await hasFile(COMPOSER_MANIFEST);
	if (!hasComposerManifest) {
		throw new Error(
			`Expected composer manifest at ${COMPOSER_MANIFEST}, but it was not found.`
		);
	}

	const composerArgs = ['install', '--no-interaction', '--no-progress'];

	await execFileAsync('composer', composerArgs, { cwd: CLI_ROOT });

	const installedAutoload = await hasFile(VENDOR_AUTOLOAD);
	if (!installedAutoload) {
		throw new Error(
			`Composer install completed but autoload.php is still missing at ${VENDOR_AUTOLOAD}.`
		);
	}
}

export default async function globalSetup() {
	await ensureComposerDependencies();
}
