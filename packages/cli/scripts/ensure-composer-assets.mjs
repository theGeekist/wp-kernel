import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const VENDOR_AUTOLOAD = path.join(CLI_ROOT, 'vendor', 'autoload.php');
const COMPOSER_MANIFEST = path.join(CLI_ROOT, 'composer.json');

async function pathExists(candidate) {
        try {
                await access(candidate);
                return true;
        } catch (error) {
                if (error && typeof error === 'object' && 'code' in error) {
                        if (error.code === 'ENOENT') {
                                return false;
                        }

                        throw error;
                }

                throw error;
        }
}

function execFileAsync(command, args, options) {
        return new Promise((resolve, reject) => {
                execFile(command, args, options, (error, stdout, stderr) => {
                        if (error) {
                                const message =
                                        `${command} ${args.join(' ')} failed: ${stderr || error.message}`;
                                const enriched = new Error(message);
                                enriched.cause = error;
                                reject(enriched);
                                return;
                        }

                        resolve({ stdout, stderr });
                });
        });
}

async function ensureComposerAssets() {
        const hasAutoload = await pathExists(VENDOR_AUTOLOAD);
        if (hasAutoload) {
                return;
        }

        const hasManifest = await pathExists(COMPOSER_MANIFEST);
        if (!hasManifest) {
                throw new Error(
                        `Expected composer manifest at ${COMPOSER_MANIFEST}, but it was not found.`
                );
        }

        const composerBinary = process.env.WPK_CLI_COMPOSER_BIN ?? 'composer';
        const args = [
                'install',
                '--no-dev',
                '--no-interaction',
                '--no-progress',
                '--classmap-authoritative',
        ];

        const { stdout, stderr } = await execFileAsync(composerBinary, args, { cwd: CLI_ROOT });

        if (stdout) {
                process.stdout.write(stdout);
        }
        if (stderr) {
                process.stderr.write(stderr);
        }

        const autoloadInstalled = await pathExists(VENDOR_AUTOLOAD);
        if (!autoloadInstalled) {
                        throw new Error(
                                `Composer install completed but autoload.php is still missing at ${VENDOR_AUTOLOAD}.`
                        );
        }
}

await ensureComposerAssets();
