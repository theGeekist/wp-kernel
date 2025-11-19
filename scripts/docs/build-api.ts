import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..', '..');
const docsDir = path.join(rootDir, 'docs');
const cacheFile = path.join(docsDir, 'api', '.typedoc-cache.json');
const typedocConfig = path.join(rootDir, 'typedoc.json');
const tsconfigDocs = path.join(rootDir, 'tsconfig.docs.json');
const CACHE_VERSION = 1;

const packages = [
	'core',
	'ui',
	'cli',
	'pipeline',
	'php-json-ast',
	'wp-json-ast',
	'test-utils',
	'e2e-utils',
	'create-wpk',
];

type CacheState = {
	version: number;
	signature: string;
};

type RunOptions = {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
};

function resolveBooleanEnv(value: string | undefined): boolean {
	if (!value) {
		return false;
	}

	return !['0', 'false', 'no'].includes(value.toLowerCase());
}

async function runCommand(
	command: string,
	args: string[],
	options: RunOptions = {}
) {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd ?? rootDir,
			env: { ...process.env, ...options.env },
			stdio: 'inherit',
		});

		child.on('error', (error) => {
			reject(error);
		});

		child.on('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}

			const reason =
				signal !== null && signal !== undefined
					? new Error(`${command} exited due to signal ${signal}`)
					: new Error(`${command} exited with code ${code}`);

			reject(reason);
		});
	});
}

async function readCache(): Promise<CacheState | null> {
	try {
		const raw = await fs.readFile(cacheFile, 'utf8');
		const parsed = JSON.parse(raw) as CacheState;

		if (
			parsed.version !== CACHE_VERSION ||
			typeof parsed.signature !== 'string'
		) {
			return null;
		}

		return parsed;
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

async function writeCache(signature: string) {
	const payload: CacheState = {
		version: CACHE_VERSION,
		signature,
	};

	await fs.mkdir(path.dirname(cacheFile), { recursive: true });
	await fs.writeFile(cacheFile, JSON.stringify(payload, null, 2), 'utf8');
}

async function pathExists(target: string) {
	try {
		await fs.access(target);
		return true;
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}

async function collectSourceFiles(): Promise<string[]> {
	const patterns = packages.map((pkg) =>
		path.join(
			rootDir,
			'packages',
			pkg,
			'src',
			'**',
			'*.{ts,tsx,js,jsx,d.ts}'
		)
	);
	const results = await Promise.all(
		patterns.map((pattern) => glob(pattern, { nodir: true }))
	);
	const files = new Set<string>();

	for (const list of results) {
		for (const file of list) {
			files.add(path.resolve(file));
		}
	}

	files.add(typedocConfig);
	// tsconfigDocs is not used directly by Typedoc, but it's part of the dependencies, so keep it for signature calculation
	files.add(tsconfigDocs);

	for (const pkg of packages) {
		files.add(path.join(rootDir, 'packages', pkg, 'package.json'));
		// Add package-specific tsconfig.json to source files for signature calculation
		files.add(path.join(rootDir, 'packages', pkg, 'tsconfig.json'));
	}

	return Array.from(files).sort();
}

async function computeSignature(): Promise<string> {
	const hash = createHash('sha256');
	const files = await collectSourceFiles();

	for (const file of files) {
		hash.update(file);
		try {
			const content = await fs.readFile(file);
			hash.update(content);
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				continue;
			}

			throw error;
		}
	}

	return hash.digest('hex');
}

// Build scripts often have sequential logic that naturally increases complexity
/* eslint-disable complexity, sonarjs/cognitive-complexity */
async function main() {
	const args = process.argv.slice(2);
	const force =
		resolveBooleanEnv(process.env.DOCS_API_FORCE) ||
		args.includes('--force');
	const passThroughArgs = args.filter((arg) => arg !== '--force');
	const watchMode = passThroughArgs.includes('--watch');

	// Clear previous generated API docs
	if (await pathExists(path.join(docsDir, 'api', '@wpkernel'))) {
		await fs.rm(path.join(docsDir, 'api', '@wpkernel'), {
			recursive: true,
			force: true,
		});
	}

	if (watchMode) {
		// In watch mode, we might want to run Typedoc for all packages or a specific one.
		// For simplicity, let's run for all in watch mode too, but without caching.
		for (const pkg of packages) {
			const entryPoint = path.join(
				rootDir,
				'packages',
				pkg,
				'src',
				'index.ts'
			);
			const tsconfigPath = path.join(
				rootDir,
				'packages',
				pkg,
				'tsconfig.json'
			);
			const outDir = path.join(docsDir, 'api', '@wpkernel', pkg);

			if (await pathExists(entryPoint)) {
				console.log(`Generating API docs for @wpkernel/${pkg}...`);
				await runCommand('pnpm', [
					'exec',
					'typedoc',
					'--entryPoints',
					entryPoint,
					'--tsconfig',
					tsconfigPath,
					'--options',
					typedocConfig, // Use the root typedoc.json for global options
					'--out',
					outDir,
					...passThroughArgs,
				]);
			} else {
				console.warn(
					`Skipping API docs for @wpkernel/${pkg}: Entry point not found at ${entryPoint}`
				);
			}
		}
		await runCommand('node', ['scripts/postprocess-typedoc.mjs']);
		return;
	}

	const generatedDirs = packages.map((pkg) =>
		path.join(docsDir, 'api', '@wpkernel', pkg)
	);
	const allGeneratedExist = (
		await Promise.all(generatedDirs.map(pathExists))
	).every(Boolean);
	const signature = await computeSignature();

	if (!force && allGeneratedExist) {
		const cache = await readCache();

		if (cache?.signature === signature) {
			console.log(
				'docs:api - cached output is up to date; skipping TypeDoc.'
			);
			return;
		}
	}

	console.log('docs:api - changes detected, regenerating TypeDoc output...');
	for (const pkg of packages) {
		const entryPoint = path.join(
			rootDir,
			'packages',
			pkg,
			'src',
			'index.ts'
		);
		const tsconfigPath = path.join(
			rootDir,
			'packages',
			pkg,
			'tsconfig.json'
		);
		const outDir = path.join(docsDir, 'api', '@wpkernel', pkg);

		if (await pathExists(entryPoint)) {
			console.log(`Generating API docs for @wpkernel/${pkg}...`);
			await runCommand('pnpm', [
				'exec',
				'typedoc',
				'--entryPoints',
				entryPoint,
				'--tsconfig',
				tsconfigPath,
				'--options',
				typedocConfig, // Use the root typedoc.json for global options
				'--out',
				outDir,
				...passThroughArgs,
			]);
		} else {
			console.warn(
				`Skipping API docs for @wpkernel/${pkg}: Entry point not found at ${entryPoint}`
			);
		}
	}
	await runCommand('node', ['scripts/postprocess-typedoc.mjs']);
	await writeCache(signature);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
