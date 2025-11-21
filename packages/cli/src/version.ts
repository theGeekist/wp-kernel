import packageJson from '../package.json';

/**
 * Package semantic version.
 *
 * Exported so the CLI and other tools can display a stable package version
 * and include it in generated artifacts or `--version` output.
 */
export const VERSION: string =
	typeof packageJson?.version === 'string' && packageJson.version.length > 0
		? packageJson.version
		: '0.0.0';
