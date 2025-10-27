import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { WPKernelError } from '@wpkernel/core/contracts';

const SNAPSHOT_DIR = path.resolve(
	process.cwd(),
	'packages/ui/vendor/dataviews-snapshot'
);
const DEFAULT_SOURCE = path.resolve(
	process.cwd(),
	'gutenberg/packages/dataviews'
);

interface SnapshotOptions {
	sourceDir: string;
}

interface VersionTuple {
	major: number;
	minor: number;
	patch: number;
}

function parseArgs(argv: string[]): SnapshotOptions {
	const options: SnapshotOptions = { sourceDir: DEFAULT_SOURCE };

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--source' && argv[index + 1]) {
			options.sourceDir = path.resolve(process.cwd(), argv[index + 1]);
			index += 1;
		}
	}

	if (process.env.GUTENBERG_PATH) {
		options.sourceDir = path.resolve(
			process.cwd(),
			process.env.GUTENBERG_PATH,
			'packages/dataviews'
		);
	}

	return options;
}

async function ensureDirectoryExists(dir: string): Promise<void> {
	try {
		await mkdir(dir, { recursive: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
			throw error;
		}
	}
}

async function assertDirectory(dir: string): Promise<void> {
	try {
		const stats = await stat(dir);
		if (!stats.isDirectory()) {
			throw new WPKernelError('DeveloperError', {
				message: `${dir} is not a directory`,
				context: { path: dir },
			});
		}
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === 'ENOENT') {
			throw new WPKernelError('DeveloperError', {
				message:
					`DataViews source directory not found: ${dir}. ` +
					'Provide --source or set GUTENBERG_PATH.',
				context: { path: dir },
			});
		}
		throw error;
	}
}

function parseVersion(input: string): VersionTuple {
	const [major, minor, patch] = input
		.split('.')
		.map((part) => Number.parseInt(part, 10));
	if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
		throw new WPKernelError('DeveloperError', {
			message: `Invalid semantic version: ${input}`,
		});
	}
	return { major, minor, patch };
}

function satisfiesCaretRange(range: string, version: string): boolean {
	const normalizedRange = range.trim();
	if (!normalizedRange.startsWith('^')) {
		throw new WPKernelError('DeveloperError', {
			message: `Unsupported peer range format: ${range}`,
		});
	}

	const base = parseVersion(normalizedRange.slice(1));
	const target = parseVersion(version);

	if (target.major !== base.major) {
		return false;
	}

	if (target.minor > base.minor) {
		return true;
	}

	if (target.minor < base.minor) {
		return false;
	}

	return target.patch >= base.patch;
}

async function runCommand(command: string, args: string[]): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			env: {
				...process.env,
				CI: '1',
			},
		});
		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(
					new WPKernelError('DeveloperError', {
						message: `${command} ${args.join(' ')} exited with code ${code}`,
						context: { command, args, exitCode: code ?? undefined },
					})
				);
			}
		});
		child.on('error', reject);
	});
}

async function readJSON<T>(filePath: string): Promise<T> {
	const content = await readFile(filePath, 'utf8');
	return JSON.parse(content) as T;
}

async function writeSnapshotReadme(commit: string): Promise<void> {
	const date = new Date().toISOString().slice(0, 10);
	const readme = `# dataviews-snapshot

- **Origin:** Gutenberg \`@wordpress/dataviews\` package
- **Commit:** \`${commit}\`
- **Synced:** ${date}

This snapshot is provided for reference only; **runtime code in \`@wpkernel/ui\` must import from \`@wordpress/dataviews\` (installed dependency)**, _not_ from this directory.
It exists so offline/cloud agents can inspect the latest core implementation while working
on the DataViews integration phases.

The original upstream README is available as \`README.upstream.md\`.
`;
	await writeFile(path.join(SNAPSHOT_DIR, 'README.md'), readme, 'utf8');
}

async function updateSnapshot(sourceDir: string): Promise<void> {
	await assertDirectory(sourceDir);
	await ensureDirectoryExists(SNAPSHOT_DIR);

	const targetSrc = path.join(SNAPSHOT_DIR, 'src');
	await rm(targetSrc, { recursive: true, force: true });
	await cp(path.join(sourceDir, 'src'), targetSrc, { recursive: true });

	const upstreamReadme = path.join(sourceDir, 'README.md');
	try {
		await cp(upstreamReadme, path.join(SNAPSHOT_DIR, 'README.upstream.md'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}

	const gitRoot = path.resolve(sourceDir, '..', '..');
	let commit = 'unknown';
	try {
		await new Promise<void>((resolve, reject) => {
			const child = spawn('git', ['rev-parse', 'HEAD'], {
				cwd: gitRoot,
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			let output = '';
			child.stdout?.on('data', (chunk) => {
				output += chunk.toString();
			});
			child.on('close', (code) => {
				if (code === 0) {
					commit = output.trim();
					resolve();
				} else {
					reject(
						new WPKernelError('UnknownError', {
							message: 'git rev-parse failed',
						})
					);
				}
			});
			child.on('error', reject);
		});
	} catch (error) {
		console.warn('Unable to determine Gutenberg commit:', error);
	}

	await writeSnapshotReadme(commit);

	const sourcePackage = await readJSON<{ version: string }>(
		path.join(sourceDir, 'package.json')
	);
	const uiPackage = await readJSON<{
		peerDependencies: Record<string, string>;
	}>(path.resolve('packages/ui/package.json'));
	const peerRange = uiPackage.peerDependencies['@wordpress/dataviews'];
	if (!peerRange) {
		throw new WPKernelError('DeveloperError', {
			message: 'Peer dependency for @wordpress/dataviews not declared.',
		});
	}
	if (!satisfiesCaretRange(peerRange, sourcePackage.version)) {
		throw new WPKernelError('DeveloperError', {
			message: `Snapshot version ${sourcePackage.version} is outside peer range ${peerRange}.`,
			context: { peerRange, version: sourcePackage.version },
		});
	}

	await runCommand('pnpm', ['--filter', '@wpkernel/ui', 'typecheck']);

	console.log(`SUCCESS: snapshot synchronized to ${commit}`);
}

async function main(): Promise<void> {
	try {
		const options = parseArgs(process.argv.slice(2));
		await updateSnapshot(options.sourceDir);
	} catch (error) {
		console.error('Failed to update DataViews snapshot:', error);
		process.exitCode = 1;
	}
}

void main();
