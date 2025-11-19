import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveCurrentDir(): string {
	if (typeof __dirname === 'string') {
		return __dirname;
	}

	// eslint-disable-next-line no-eval -- accessing import.meta in both CJS and ESM contexts
	const meta = (0, eval)('import.meta') as ImportMeta;
	return path.dirname(fileURLToPath(meta.url));
}

const CURRENT_DIR = resolveCurrentDir();
const REPO_ROOT = path.resolve(CURRENT_DIR, '..', '..', '..', '..');
const NODE_MODULES_ROOT = path.join(REPO_ROOT, 'node_modules');
const AUTOLOAD_CANDIDATES = [
	path.join(REPO_ROOT, 'packages', 'cli', 'vendor', 'autoload.php'),
	path.join(REPO_ROOT, 'packages', 'php-json-ast', 'vendor', 'autoload.php'),
	path.join(REPO_ROOT, 'packages', 'php-driver', 'vendor', 'autoload.php'),
];

const PHP_AUTOLOAD_ENV_KEYS = [
	'WPK_PHP_AUTOLOAD',
	'WPK_PHP_AUTOLOAD_PATHS',
	'PHP_DRIVER_AUTOLOAD',
	'PHP_DRIVER_AUTOLOAD_PATHS',
] as const;

function filterExisting(paths: readonly string[]): string[] {
	return paths.filter((candidate) => {
		try {
			return fs.existsSync(candidate);
		} catch {
			return false;
		}
	});
}

function mergeDelimitedValues(
	existing: string | undefined,
	additions: readonly string[]
): string {
	const segments = new Set<string>();
	for (const value of additions) {
		if (value && value.length > 0) {
			segments.add(value);
		}
	}

	if (existing) {
		for (const value of existing.split(path.delimiter)) {
			const trimmed = value.trim();
			if (trimmed.length > 0) {
				segments.add(trimmed);
			}
		}
	}

	return Array.from(segments).join(path.delimiter);
}

/**
 * Builds an environment object suitable for running PHP integration tests.
 *
 * This function sets up `WPK_PHP_AUTOLOAD_PATHS` and `NODE_PATH` environment variables
 * to ensure PHP and Node.js dependencies are correctly resolved during tests.
 *
 * @category Integration
 * @param    baseEnv - The base environment variables to extend (defaults to `process.env`).
 * @returns A new environment object with PHP integration paths configured.
 */
export function buildPhpIntegrationEnv(
	baseEnv: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...baseEnv };
	let explicitAutoloadPaths: string | undefined;

	if (
		Object.prototype.hasOwnProperty.call(baseEnv, 'WPK_PHP_AUTOLOAD_PATHS')
	) {
		explicitAutoloadPaths = baseEnv.WPK_PHP_AUTOLOAD_PATHS;
	} else if (
		Object.prototype.hasOwnProperty.call(
			baseEnv,
			'PHP_DRIVER_AUTOLOAD_PATHS'
		)
	) {
		explicitAutoloadPaths = baseEnv.PHP_DRIVER_AUTOLOAD_PATHS;
	}

	if (explicitAutoloadPaths === undefined) {
		env.WPK_PHP_AUTOLOAD_PATHS = mergeDelimitedValues(
			env.WPK_PHP_AUTOLOAD_PATHS,
			filterExisting(AUTOLOAD_CANDIDATES)
		);
	} else {
		env.WPK_PHP_AUTOLOAD_PATHS = explicitAutoloadPaths;
	}

	if (
		Object.prototype.hasOwnProperty.call(env, 'PHP_DRIVER_AUTOLOAD_PATHS')
	) {
		delete env.PHP_DRIVER_AUTOLOAD_PATHS;
	}

	const existingNodePath = env.NODE_PATH;
	const desiredNodePath = mergeDelimitedValues(existingNodePath, [
		NODE_MODULES_ROOT,
	]);
	if (desiredNodePath.length > 0) {
		env.NODE_PATH = desiredNodePath;
	}

	return env;
}

export function sanitizePhpIntegrationEnv(
	baseEnv: NodeJS.ProcessEnv,
	overrides?: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
	const sanitized: NodeJS.ProcessEnv = { ...baseEnv };

	for (const key of PHP_AUTOLOAD_ENV_KEYS) {
		if (key in sanitized) {
			delete sanitized[key];
		}
	}

	if (overrides) {
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined) {
				delete sanitized[key];
			} else {
				sanitized[key] = value;
			}
		}
	}

	return sanitized;
}

export function buildCliIntegrationEnv(
	baseEnv: NodeJS.ProcessEnv = process.env,
	overrides?: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
	const env = sanitizePhpIntegrationEnv(baseEnv, overrides);

	env.NODE_ENV = 'test';
	env.FORCE_COLOR = '0';

	if ('WPK_CLI_FORCE_SOURCE' in env) {
		delete env.WPK_CLI_FORCE_SOURCE;
	}

	return buildPhpIntegrationEnv(env);
}
