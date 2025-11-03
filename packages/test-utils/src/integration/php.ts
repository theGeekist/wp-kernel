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
