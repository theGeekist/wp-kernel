import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import type { EphemeralRegistry, RegistryPublishSummary } from './types.js';

interface CreateRegistryOptions {
	workspaceRoot: string;
	port?: number;
	packages?: string[];
	pnpmBinary?: string;
}

interface PublishedPackage {
	summary: RegistryPublishSummary;
	tarballFileName: string;
}

export async function createEphemeralRegistry(
	options: CreateRegistryOptions
): Promise<EphemeralRegistry> {
	const pnpm = options.pnpmBinary ?? 'pnpm';
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-registry-'));
	const publishDirs =
		options.packages ??
		(await discoverKernelPackages(options.workspaceRoot)).map(
			(pkg) => pkg.dir
		);

	const published = await Promise.all(
		publishDirs.map((dir) => packWorkspacePackage(dir, tempDir, pnpm))
	);

	const metadata = new Map<string, PublishedPackage>();

	for (const entry of published) {
		metadata.set(entry.summary.name, entry);
	}

	let registryUrl = 'http://127.0.0.1';

	const server = http.createServer(async (req, res) => {
		/* istanbul ignore next - guard for broken HTTP requests */
		if (!req.url) {
			res.statusCode = 400;
			res.end('Bad Request');
			return;
		}

		const url = new URL(req.url, registryUrl);

		if (
			req.method === 'GET' &&
			(url.pathname === '/-/ping' || url.pathname === '/-/whoami')
		) {
			res.statusCode = 200;
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ ok: true }));
			return;
		}

		if (req.method === 'GET' && url.pathname.startsWith('/-/package/')) {
			handleDistTagRequest(url, metadata, res);
			return;
		}

		if (req.method === 'GET' && url.pathname.endsWith('.tgz')) {
			void serveTarball(url, metadata, tempDir, res);
			return;
		}

		if (req.method === 'GET') {
			handleMetadataRequest(url, metadata, res, registryUrl);
			return;
		}

		res.statusCode = 405;
		res.end('Method Not Allowed');
	});

	await new Promise<void>((resolve) => {
		server.listen(options.port ?? 0, '127.0.0.1', () => resolve());
	});

	const address = server.address();
	/* istanbul ignore next - defensive guard for Node HTTP quirks */
	if (!address || typeof address === 'string') {
		throw new Error('Failed to determine registry address');
	}

	const url = `http://127.0.0.1:${address.port}`;
	registryUrl = url;

	const npmrcLines = [`registry=${url}`, `@wpkernel:registry=${url}`];
	const startedAt = new Date().toISOString();

	return {
		url,
		packages: published.map((entry) => entry.summary),
		startedAt,
		npmrc: npmrcLines.join('\n') + '\n',
		async writeNpmRc(targetDir: string) {
			const filePath = path.join(targetDir, '.npmrc');
			await fs.writeFile(filePath, this.npmrc, 'utf8');
		},
		async dispose() {
			await new Promise<void>((resolve) => server.close(() => resolve()));
			await fs.rm(tempDir, { recursive: true, force: true });
		},
	} satisfies EphemeralRegistry;
}

async function discoverKernelPackages(
	workspaceRoot: string
): Promise<Array<{ dir: string; name: string }>> {
	const packagesDir = path.join(workspaceRoot, 'packages');
	const entries = await fs.readdir(packagesDir, { withFileTypes: true });
	const packages: Array<{ dir: string; name: string }> = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const pkgDir = path.join(packagesDir, entry.name);
		const packageJsonPath = path.join(pkgDir, 'package.json');

		try {
			const raw = await fs.readFile(packageJsonPath, 'utf8');
			const pkg = JSON.parse(raw) as { name?: string };
			if (pkg.name && pkg.name.startsWith('@wpkernel/')) {
				packages.push({ dir: pkgDir, name: pkg.name });
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				continue;
			}
			throw error;
		}
	}

	return packages;
}

async function packWorkspacePackage(
	directory: string,
	destination: string,
	pnpmBinary: string
): Promise<PublishedPackage> {
	const args = ['pack', '--pack-destination', destination, '--silent'];
	const pack = spawn(pnpmBinary, args, {
		cwd: directory,
		env: {
			...process.env,
			npm_config_ignore_scripts: 'true',
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	const stdoutChunks: Buffer[] = [];
	const stderrChunks: Buffer[] = [];

	pack.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
	pack.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

	const outcome = await waitForProcessCompletion(pack);
	const stderr = Buffer.concat(stderrChunks).toString('utf8');

	if (outcome.type === 'error') {
		const failureMessage = formatSpawnError(
			pnpmBinary,
			args,
			outcome.error
		);
		const details = stderr
			? `${stderr}\n${failureMessage}`
			: failureMessage;
		throw new Error(`Failed to pack package at ${directory}: ${details}`);
	}

	if (outcome.code !== 0) {
		throw new Error(`Failed to pack package at ${directory}: ${stderr}`);
	}

	const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim();
	const tarballPath = path.isAbsolute(stdout)
		? stdout
		: path.join(destination, path.basename(stdout));

	const pkgJsonRaw = await fs.readFile(
		path.join(directory, 'package.json'),
		'utf8'
	);
	const pkgJson = JSON.parse(pkgJsonRaw) as { name: string; version: string };

	const tarballFullPath = tarballPath;
	const tarball = await fs.readFile(tarballFullPath);

	const shasum = crypto.createHash('sha1').update(tarball).digest('hex');
	const integrity = `sha512-${crypto.createHash('sha512').update(tarball).digest('base64')}`;

	const summary: RegistryPublishSummary = {
		name: pkgJson.name,
		version: pkgJson.version,
		tarballPath: tarballFullPath,
		integrity,
		shasum,
	};

	return {
		summary,
		tarballFileName: path.basename(tarballFullPath),
	};
}

type ProcessOutcome =
	| { type: 'exit'; code: number | null; signal: NodeJS.Signals | null }
	| { type: 'error'; error: NodeJS.ErrnoException };

function waitForProcessCompletion(
	child: ChildProcess
): Promise<ProcessOutcome> {
	return new Promise<ProcessOutcome>((resolve) => {
		const handleExit = (
			code: number | null,
			signal: NodeJS.Signals | null
		) => {
			cleanup();
			resolve({ type: 'exit', code, signal });
		};

		const handleError = (error: NodeJS.ErrnoException) => {
			cleanup();
			resolve({ type: 'error', error });
		};

		const cleanup = () => {
			child.removeListener('exit', handleExit);
			child.removeListener('error', handleError);
		};

		child.once('exit', handleExit);
		child.once('error', handleError);
	});
}

function formatSpawnError(
	command: string,
	args: string[],
	error: NodeJS.ErrnoException
): string {
	const fullCommand = [command, ...args].join(' ').trim();
	const details = error.code
		? `${error.code}: ${error.message}`
		: error.message;
	return `Failed to spawn command "${fullCommand}"${details ? ` - ${details}` : ''}`;
}

function handleMetadataRequest(
	url: URL,
	metadata: Map<string, PublishedPackage>,
	res: http.ServerResponse,
	registryUrl: string
): void {
	const name = decodePackageName(url.pathname);
	if (!name) {
		res.statusCode = 404;
		res.end('Not Found');
		return;
	}

	const entry = metadata.get(name);
	/* istanbul ignore next - validated via explicit metadata tests */
	if (!entry) {
		res.statusCode = 404;
		res.end('Not Found');
		return;
	}

	const body = {
		name,
		'dist-tags': {
			latest: entry.summary.version,
		},
		versions: {
			[entry.summary.version]: {
				name,
				version: entry.summary.version,
				dist: {
					shasum: entry.summary.shasum,
					integrity: entry.summary.integrity,
					tarball: `${registryUrl}/${encodePackageName(name)}/-/${entry.tarballFileName}`,
				},
				_id: `${name}@${entry.summary.version}`,
			},
		},
	};

	res.statusCode = 200;
	res.setHeader('content-type', 'application/json');
	res.end(JSON.stringify(body));
}

function handleDistTagRequest(
	url: URL,
	metadata: Map<string, PublishedPackage>,
	res: http.ServerResponse
): void {
	const segments = url.pathname.split('/');
	const encodedName = segments[3];
	const name = decodeURIComponent(encodedName ?? '');
	const entry = metadata.get(name);

	/* istanbul ignore next - missing package covered elsewhere */
	if (!entry) {
		res.statusCode = 404;
		res.end('Not Found');
		return;
	}

	if (url.pathname.endsWith('/dist-tags')) {
		res.statusCode = 200;
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ latest: entry.summary.version }));
		return;
	}

	if (url.pathname.endsWith('/versions')) {
		res.statusCode = 200;
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ versions: [entry.summary.version] }));
		return;
	}

	/* istanbul ignore next - unsupported dist-tag paths */
	res.statusCode = 404;
	res.end('Not Found');
}

async function serveTarball(
	url: URL,
	metadata: Map<string, PublishedPackage>,
	tempDir: string,
	res: http.ServerResponse
): Promise<void> {
	const segments = url.pathname.split('/-/');
	const packageSegment = segments[0];
	if (!packageSegment) {
		res.statusCode = 404;
		res.end('Not Found');
		return;
	}

	const name = decodePackageName(packageSegment);
	if (!name) {
		res.statusCode = 404;
		res.end('Not Found');
		return;
	}

	const entry = metadata.get(name);
	/* istanbul ignore next - missing tarball covered elsewhere */
	if (!entry) {
		res.statusCode = 404;
		res.end('Not Found');
		return;
	}

	const tarballPath = path.join(tempDir, entry.tarballFileName);

	try {
		const stream = (await fs.open(tarballPath)).createReadStream();
		res.statusCode = 200;
		res.setHeader('content-type', 'application/octet-stream');
		stream.pipe(res);
	} catch (error) {
		res.statusCode = 500;
		res.end(`Failed to read tarball: ${(error as Error).message}`);
	}
}

function encodePackageName(name: string): string {
	if (name.startsWith('@')) {
		const [scope, pkg] = name.split('/');
		return `${encodeURIComponent(scope ?? '')}%2F${encodeURIComponent(pkg ?? '')}`;
	}
	return encodeURIComponent(name);
}

function decodePackageName(pathname: string): string | undefined {
	const clean = pathname.replace(/^\/+/, '');
	if (!clean) {
		return undefined;
	}

	if (clean.includes('%2F')) {
		return decodeURIComponent(clean);
	}

	if (clean.startsWith('@')) {
		const [scope, pkg] = clean.split('/');
		if (scope && pkg) {
			return `${scope}/${pkg}`;
		}
	}

	return decodeURIComponent(clean);
}
