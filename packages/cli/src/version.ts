/**
 * Package semantic version.
 *
 * Exported so the CLI and other tools can display a stable package version
 * and include it in generated artifacts or `--version` output.
 */
export const VERSION: string =
	typeof process === 'undefined'
		? '0.0.0'
		: (process.env.npm_package_version ?? '0.0.0');
