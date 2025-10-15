import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { getCliPackageRoot, getModuleUrl } from './module-url';

export type DependencyVersionSource =
	| 'fallback'
	| 'bundled-manifest'
	| 'registry'
	| 'workspace-core';

export interface DependencyVersions {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	peerDependencies: Record<string, string>;
}

export interface DependencyResolution extends DependencyVersions {
	source: DependencyVersionSource;
	sources: DependencyVersionSource[];
}

interface VersionsManifest {
	coreVersion: string;
	generatedAt: string;
	peers: Record<string, string>;
}

const KERNEL_DEPENDENCIES: Record<string, string> = {
	'@wpkernel/core': 'latest',
	'@wpkernel/ui': 'latest',
};

const FALLBACK_PEER_VERSIONS: Record<string, string> = {
	react: '^18.3.1',
	'react-dom': '^18.3.1',
	'@wordpress/api-fetch': '^7.32.0',
	'@wordpress/components': '^30.5.0',
	'@wordpress/data': '^10.32.0',
	'@wordpress/dataviews': '^9.1.0',
	'@wordpress/element': '^6.32.0',
	'@wordpress/hooks': '^4.32.0',
	'@wordpress/i18n': '^6.5.0',
	loglayer: '>=6.7.2',
	'@loglayer/shared': '>=2.4.0',
	'@loglayer/transport': '>=2.3.0',
};

const FALLBACK_DEV_TOOL_VERSIONS: Record<string, string> = {
	typescript: '^5.9.3',
	vite: '^7.1.9',
	'@types/react': '^18.3.26',
	'@types/react-dom': '^18.3.7',
	'@kucrut/vite-for-wp': '^0.12.0',
	'rollup-plugin-external-globals': '^0.13.0',
	'vite-plugin-external': '^6.2.2',
};

interface ResolveDependencyOptions {
	preferRegistryVersions?: boolean;
	registryUrl?: string;
	fetch?: typeof fetch;
}

export async function resolveDependencyVersions(
	workspace: string,
	options: ResolveDependencyOptions = {}
): Promise<DependencyResolution> {
	const manifestPeers = await loadBundledManifestPeers();
	const corePeers = await loadPeersFromLocalCore(workspace);
	const registryPeers = await loadPeersFromRegistry({
		hasWorkspacePeers: Object.keys(corePeers).length > 0,
		preferRegistryVersions: options.preferRegistryVersions === true,
		registryUrl: options.registryUrl,
		fetchImpl: options.fetch,
	});
	const kernelDevDependencies = await loadKernelDevDependencies(workspace);

	const sources: DependencyVersionSource[] = ['fallback'];

	const peersWithFallback = { ...FALLBACK_PEER_VERSIONS };

	let peerDependencies = peersWithFallback;

	if (Object.keys(manifestPeers).length > 0) {
		sources.push('bundled-manifest');
		peerDependencies = {
			...peerDependencies,
			...manifestPeers,
		};
	}

	if (Object.keys(registryPeers).length > 0) {
		sources.push('registry');
		peerDependencies = {
			...peerDependencies,
			...registryPeers,
		};
	}

	if (Object.keys(corePeers).length > 0) {
		sources.push('workspace-core');
		peerDependencies = {
			...peerDependencies,
			...corePeers,
		};
	}

	const sortedPeerDependencies = sortDependencies(peerDependencies);

	const devDependencies = sortDependencies({
		...sortedPeerDependencies,
		...FALLBACK_DEV_TOOL_VERSIONS,
		...kernelDevDependencies,
	});

	const finalSource = sources[sources.length - 1] ?? 'fallback';

	return {
		dependencies: { ...KERNEL_DEPENDENCIES },
		devDependencies,
		peerDependencies: sortedPeerDependencies,
		source: finalSource,
		sources,
	};
}

async function loadPeersFromLocalCore(
	workspace: string
): Promise<Record<string, string>> {
	const requireFromCli = createRequire(getModuleUrl());

	try {
		const resolved = requireFromCli.resolve('@wpkernel/core/package.json', {
			paths: [workspace],
		});
		if (!isPathWithinWorkspace(resolved, workspace)) {
			return {};
		}
		const raw = await fs.readFile(resolved, 'utf8');
		const pkg = JSON.parse(raw) as {
			peerDependencies?: Record<string, string>;
		};
		return pkg.peerDependencies ?? {};
	} catch (error) {
		if (isModuleNotFound(error, '@wpkernel/core')) {
			return {};
		}
		throw error;
	}
}

async function loadKernelDevDependencies(
	workspace: string
): Promise<Record<string, string>> {
	const entries: Array<[string, string]> = [];

	const cliVersion = await resolveWorkspacePackageVersion(
		workspace,
		'@wpkernel/cli'
	);
	if (cliVersion) {
		entries.push(['@wpkernel/cli', cliVersion]);
	}

	const e2eUtilsVersion = await resolveWorkspacePackageVersion(
		workspace,
		'@wpkernel/e2e-utils'
	);
	if (e2eUtilsVersion) {
		entries.push(['@wpkernel/e2e-utils', e2eUtilsVersion]);
	}

	return Object.fromEntries(entries);
}

async function loadBundledManifestPeers(): Promise<Record<string, string>> {
	const cliRoot = getCliPackageRoot();
	const manifestPath = path.join(cliRoot, 'dist', 'cli', 'versions.json');

	try {
		const raw = await fs.readFile(manifestPath, 'utf8');
		const manifest = JSON.parse(raw) as VersionsManifest;
		if (!manifest || typeof manifest !== 'object') {
			return {};
		}

		const { peers } = manifest;
		if (!peers || typeof peers !== 'object') {
			return {};
		}

		return peers;
	} catch (error) {
		if (isENOENT(error)) {
			return {};
		}
		throw error;
	}
}

interface RegistryPeerOptions {
	hasWorkspacePeers: boolean;
	preferRegistryVersions: boolean;
	registryUrl?: string;
	fetchImpl?: typeof fetch;
}

async function loadPeersFromRegistry(
	options: RegistryPeerOptions
): Promise<Record<string, string>> {
	if (!shouldQueryRegistry(options)) {
		return {};
	}

	const effectiveFetch = options.fetchImpl ?? globalThis.fetch;

	if (typeof effectiveFetch !== 'function') {
		return {};
	}

	try {
		const response = await effectiveFetch(
			buildRegistryRequestUrl(options.registryUrl)
		);

		if (!response.ok) {
			return {};
		}

		const manifest = await response.json();
		return extractRegistryPeers(manifest) ?? {};
	} catch (_error) {
		return {};
	}
}

function shouldQueryRegistry({
	hasWorkspacePeers,
	preferRegistryVersions,
}: RegistryPeerOptions): boolean {
	return preferRegistryVersions && !hasWorkspacePeers;
}

function buildRegistryRequestUrl(registryUrl?: string): string {
	const base = (registryUrl ?? 'https://registry.npmjs.org').replace(
		/\/+$/,
		'/'
	);
	return new URL('@wpkernel/core', base).toString();
}

function extractRegistryPeers(
	manifest: unknown
): Record<string, string> | undefined {
	const latest = getLatestRegistryVersion(manifest);

	if (!latest) {
		return undefined;
	}

	const entry = getRegistryVersionEntry(manifest, latest);

	if (!entry) {
		return undefined;
	}

	const peers = entry.peerDependencies;

	return peers && typeof peers === 'object'
		? (peers as Record<string, string>)
		: undefined;
}

function getLatestRegistryVersion(manifest: unknown): string | undefined {
	if (!manifest || typeof manifest !== 'object') {
		return undefined;
	}

	const distTags = (manifest as { 'dist-tags'?: { latest?: unknown } })[
		'dist-tags'
	];
	const latest =
		distTags && typeof distTags === 'object'
			? (distTags as { latest?: unknown }).latest
			: undefined;

	return typeof latest === 'string' && latest.length > 0 ? latest : undefined;
}

function getRegistryVersionEntry(
	manifest: unknown,
	version: string
): { peerDependencies?: unknown } | undefined {
	if (!manifest || typeof manifest !== 'object') {
		return undefined;
	}

	const versions = (
		manifest as {
			versions?: Record<string, { peerDependencies?: unknown }>;
		}
	).versions;

	if (!versions || typeof versions !== 'object') {
		return undefined;
	}

	const entry = versions[version];

	return entry && typeof entry === 'object'
		? (entry as { peerDependencies?: unknown })
		: undefined;
}

function isENOENT(error: unknown): error is NodeJS.ErrnoException {
	return Boolean(
		error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as NodeJS.ErrnoException).code === 'ENOENT'
	);
}

function isModuleNotFound(
	error: unknown,
	specifier: string
): error is NodeJS.ErrnoException {
	if (
		!error ||
		typeof error !== 'object' ||
		!('code' in error) ||
		(error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND'
	) {
		return false;
	}

	const message = String((error as NodeJS.ErrnoException).message ?? '');
	return message.includes(specifier);
}

async function resolveWorkspacePackageVersion(
	workspace: string,
	specifier: string
): Promise<string | undefined> {
	const requireFromCli = createRequire(getModuleUrl());

	try {
		const resolved = requireFromCli.resolve(`${specifier}/package.json`, {
			paths: [workspace],
		});

		if (!isPathWithinWorkspace(resolved, workspace)) {
			return undefined;
		}

		const raw = await fs.readFile(resolved, 'utf8');
		const pkg = JSON.parse(raw) as { version?: string };
		return typeof pkg.version === 'string' ? pkg.version : undefined;
	} catch (error) {
		if (isModuleNotFound(error, specifier)) {
			return undefined;
		}
		throw error;
	}
}

function sortDependencies(map: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
	);
}

function isPathWithinWorkspace(resolved: string, workspace: string): boolean {
	const normalisedWorkspace = path.resolve(workspace);
	const normalisedResolved = path.resolve(resolved);
	return (
		normalisedResolved === normalisedWorkspace ||
		normalisedResolved.startsWith(normalisedWorkspace + path.sep)
	);
}
