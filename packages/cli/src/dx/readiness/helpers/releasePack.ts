import path from 'node:path';
import {
	access as accessFs,
	readFile as readFileFs,
	mkdir as mkdirFs,
	writeFile as writeFileFs,
} from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { EnvironmentalError, WPKernelError } from '@wpkernel/core/error';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessStatus,
} from '../types';
import type { DxContext } from '../../context';

const execFile = promisify(execFileCallback);

type Access = typeof accessFs;
type ExecFile = typeof execFile;
type ReadFile = typeof readFileFs;
type Mkdir = typeof mkdirFs;
type WriteFile = typeof writeFileFs;
type Now = () => number;
type CreateDate = () => Date;

export interface ReleasePackManifestEntry {
	readonly packageName: string;
	readonly packageDir: string;
	readonly expectedArtifacts: readonly string[];
	readonly buildArgs?: readonly string[];
}

export interface ReleasePackDependencies {
	readonly access: Access;
	readonly exec: ExecFile;
	readonly readFile: ReadFile;
	readonly mkdir: Mkdir;
	readonly writeFile: WriteFile;
	readonly now: Now;
	readonly createDate: CreateDate;
}

export interface ReleasePackHelperOptions {
	readonly manifest?: readonly ReleasePackManifestEntry[];
	readonly dependencies?: Partial<ReleasePackDependencies>;
	readonly metricsPath?: string;
}

export interface ReleasePackState {
	readonly repoRoot: string;
	readonly manifest: readonly ReleasePackManifestEntry[];
	readonly metrics: ReleasePackMetrics;
	readonly metricsPath: string;
}

export interface ReleasePackBuildMetric {
	readonly packageName: string;
	readonly built: boolean;
	readonly durationMs: number;
}

export interface ReleasePackMetrics {
	readonly recordedAt: string;
	readonly completedAt?: string;
	readonly detectionMs: number;
	readonly totalMs: number;
	readonly builds: readonly ReleasePackBuildMetric[];
}

interface ReleasePackMetricsEntry {
	readonly recordedAt: string;
	readonly completedAt: string;
	readonly detectionMs: number;
	readonly totalMs: number;
	readonly builds: readonly ReleasePackBuildMetric[];
}

interface ReleasePackMetricsLedger {
	readonly runs: ReleasePackMetricsEntry[];
}

const DEFAULT_METRICS_PATH = path.join(
	'docs',
	'internal',
	'ci',
	'release-pack-metrics.json'
);

interface MissingArtefact {
	readonly entry: ReleasePackManifestEntry;
	readonly artefacts: readonly string[];
}

const DEFAULT_MANIFEST: readonly ReleasePackManifestEntry[] = [
	{
		packageName: '@wpkernel/core',
		packageDir: path.join('packages', 'core'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
		],
	},
	{
		packageName: '@wpkernel/pipeline',
		packageDir: path.join('packages', 'pipeline'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
			path.join('dist', 'extensions.js'),
		],
	},
	{
		packageName: '@wpkernel/php-driver',
		packageDir: path.join('packages', 'php-driver'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'prettyPrinter', 'index.js'),
			path.join('dist', 'installer', 'index.js'),
		],
	},
	{
		packageName: '@wpkernel/cli',
		packageDir: path.join('packages', 'cli'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
		],
	},
	{
		packageName: '@wpkernel/create-wpk',
		packageDir: path.join('packages', 'create-wpk'),
		expectedArtifacts: [path.join('dist', 'index.js')],
	},
];

function defaultDependencies(): ReleasePackDependencies {
	return {
		access: accessFs,
		exec: execFile,
		readFile: readFileFs,
		mkdir: mkdirFs,
		writeFile: writeFileFs,
		now: () => performance.now(),
		createDate: () => new Date(),
	} satisfies ReleasePackDependencies;
}

function resolveMetricsPath(repoRoot: string, metricsPath?: string): string {
	if (!metricsPath) {
		return path.join(repoRoot, DEFAULT_METRICS_PATH);
	}

	return path.isAbsolute(metricsPath)
		? metricsPath
		: path.join(repoRoot, metricsPath);
}

function initialiseMetrics(
	manifest: readonly ReleasePackManifestEntry[],
	detectionMs: number,
	recordedAt: string
): ReleasePackMetrics {
	return {
		recordedAt,
		detectionMs,
		totalMs: detectionMs,
		builds: manifest.map(
			(entry) =>
				({
					packageName: entry.packageName,
					built: false,
					durationMs: 0,
				}) satisfies ReleasePackBuildMetric
		),
	} satisfies ReleasePackMetrics;
}

function updateMetricsWithBuild(
	state: ReleasePackState,
	packageName: string,
	durationMs: number
): ReleasePackState {
	const builds = state.metrics.builds.map((build) =>
		build.packageName === packageName
			? ({
					packageName: build.packageName,
					built: true,
					durationMs,
				} satisfies ReleasePackBuildMetric)
			: build
	);

	return {
		...state,
		metrics: {
			...state.metrics,
			totalMs: state.metrics.totalMs + durationMs,
			builds,
		},
	} satisfies ReleasePackState;
}

async function loadMetricsLedger(
	metricsPath: string,
	dependencies: ReleasePackDependencies
): Promise<ReleasePackMetricsLedger> {
	try {
		await dependencies.access(metricsPath);
	} catch (error) {
		if (noEntry(error)) {
			return { runs: [] } satisfies ReleasePackMetricsLedger;
		}

		throw error;
	}

	try {
		const raw = await dependencies.readFile(metricsPath, 'utf8');
		const parsed = JSON.parse(raw.toString()) as ReleasePackMetricsLedger;
		if (!parsed || !Array.isArray(parsed.runs)) {
			throw new WPKernelError('DeveloperError', {
				message: 'Release pack metrics file is invalid.',
				context: { metricsPath },
			});
		}

		return { runs: [...parsed.runs] } satisfies ReleasePackMetricsLedger;
	} catch (error) {
		if (error instanceof WPKernelError) {
			throw error;
		}

		throw new WPKernelError('DeveloperError', {
			message: 'Unable to parse release pack metrics file.',
			context: { metricsPath },
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}
}

async function persistMetrics(
	state: ReleasePackState,
	dependencies: ReleasePackDependencies
): Promise<void> {
	const completedAt = state.metrics.completedAt ?? state.metrics.recordedAt;
	const entry: ReleasePackMetricsEntry = {
		recordedAt: state.metrics.recordedAt,
		completedAt,
		detectionMs: state.metrics.detectionMs,
		totalMs: state.metrics.totalMs,
		builds: state.metrics.builds,
	} satisfies ReleasePackMetricsEntry;

	const ledger = await loadMetricsLedger(state.metricsPath, dependencies);
	const nextLedger: ReleasePackMetricsLedger = {
		runs: [...ledger.runs, entry],
	} satisfies ReleasePackMetricsLedger;

	const directory = path.dirname(state.metricsPath);
	await dependencies.mkdir(directory, { recursive: true });

	try {
		await dependencies.writeFile(
			state.metricsPath,
			`${JSON.stringify(nextLedger, null, 2)}\n`
		);
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to persist release pack metrics.',
			context: { metricsPath: state.metricsPath },
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}
}

function noEntry(error: unknown): boolean {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: string }) &&
		(error as { code?: string }).code === 'ENOENT'
	);
}

async function resolveRepoRoot(start: string, access: Access): Promise<string> {
	let current = path.resolve(start);

	while (true) {
		const probe = path.join(current, 'pnpm-workspace.yaml');

		try {
			await access(probe);
			return current;
		} catch (error) {
			if (!noEntry(error)) {
				throw error;
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			throw new WPKernelError('DeveloperError', {
				message:
					'Unable to resolve repository root for release-pack helper.',
				context: { start },
			});
		}

		current = parent;
	}
}

async function detectMissingArtefacts(
	repoRoot: string,
	manifest: readonly ReleasePackManifestEntry[],
	dependencies: ReleasePackDependencies
): Promise<MissingArtefact[]> {
	const missing: MissingArtefact[] = [];

	for (const entry of manifest) {
		const absent: string[] = [];

		for (const artefact of entry.expectedArtifacts) {
			const missingPath = await resolveMissingArtefact(
				repoRoot,
				entry.packageDir,
				artefact,
				dependencies.access
			);

			if (missingPath) {
				absent.push(missingPath);
			}
		}

		if (entry.packageName === '@wpkernel/cli') {
			const cliBundleArtefact = await detectCliPhpDriverBundle(
				repoRoot,
				entry,
				dependencies
			);

			if (cliBundleArtefact) {
				absent.push(cliBundleArtefact);
			}
		}

		if (absent.length > 0) {
			missing.push({ entry, artefacts: absent });
		}
	}

	return missing;
}

async function resolveMissingArtefact(
	repoRoot: string,
	packageDir: string,
	artefact: string,
	access: Access
): Promise<string | null> {
	const absolute = path.join(repoRoot, packageDir, artefact);

	try {
		await access(absolute);
		return null;
	} catch (error) {
		if (noEntry(error)) {
			return path.relative(repoRoot, absolute);
		}

		throw error;
	}
}

type PhpDriverRootExport =
	| string
	| {
			readonly import?: string;
			readonly default?: string;
	  };

interface PhpDriverPackageDefinition {
	readonly exports?: Record<string, PhpDriverRootExport>;
	readonly main?: string;
	readonly module?: string;
}

function normaliseEntryPath(entry: string): string {
	return entry.replace(/^\.\//, '').replace(/^\.\//, '');
}

function resolvePhpDriverEntry(
	definition: PhpDriverPackageDefinition
): string | null {
	const candidates: Array<string | undefined> = [];
	const rootExport = definition.exports?.['.'];

	if (typeof rootExport === 'string') {
		candidates.push(rootExport);
	} else if (rootExport && typeof rootExport === 'object') {
		candidates.push(rootExport.import, rootExport.default);
	}

	candidates.push(definition.module, definition.main);

	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.length > 0) {
			return normaliseEntryPath(candidate);
		}
	}

	return null;
}

async function detectCliPhpDriverBundle(
	repoRoot: string,
	entry: ReleasePackManifestEntry,
	dependencies: ReleasePackDependencies
): Promise<string | null> {
	const packageJsonPath = path.join(
		repoRoot,
		'packages',
		'php-driver',
		'package.json'
	);
	let definition: PhpDriverPackageDefinition;

	try {
		const raw = await dependencies.readFile(packageJsonPath, 'utf8');
		definition = JSON.parse(raw) as PhpDriverPackageDefinition;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Unable to load php-driver package definition for release-pack readiness.',
			context: { packageJsonPath },
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}

	const entryPoint = resolvePhpDriverEntry(definition);

	if (!entryPoint) {
		return '@wpkernel/php-driver (exports missing)';
	}

	return resolveMissingArtefact(
		repoRoot,
		entry.packageDir,
		path.join('dist', 'packages', 'php-driver', entryPoint),
		dependencies.access
	);
}

async function runBuild(
	entry: ReleasePackManifestEntry,
	repoRoot: string,
	buildArgs: readonly string[],
	dependencies: ReleasePackDependencies
): Promise<void> {
	try {
		await dependencies.exec('pnpm', buildArgs, { cwd: repoRoot });
	} catch (error) {
		throw new EnvironmentalError('build.failed', {
			message: `Failed to build ${entry.packageName}.`,
			data: {
				packageName: entry.packageName,
				command: ['pnpm', ...buildArgs],
				originalError: error instanceof Error ? error : undefined,
			},
		});
	}
}

async function ensureEntryArtefacts(
	state: ReleasePackState,
	entry: ReleasePackManifestEntry,
	dependencies: ReleasePackDependencies
): Promise<ReleasePackState> {
	const missingBefore = await detectMissingArtefacts(
		state.repoRoot,
		[entry],
		dependencies
	);

	if (missingBefore.length === 0) {
		return state;
	}

	const buildArgs = entry.buildArgs ?? [
		'--filter',
		entry.packageName,
		'build',
	];
	const buildStart = dependencies.now();
	await runBuild(entry, state.repoRoot, buildArgs, dependencies);
	const buildDuration = Math.max(0, dependencies.now() - buildStart);

	const missingAfter = await detectMissingArtefacts(
		state.repoRoot,
		[entry],
		dependencies
	);

	if (missingAfter.length === 0) {
		return updateMetricsWithBuild(state, entry.packageName, buildDuration);
	}

	const artefacts = missingAfter[0]?.artefacts ?? [];
	throw new EnvironmentalError('build.missingArtifact', {
		message: `Missing artefacts after build for ${entry.packageName}.`,
		data: {
			packageName: entry.packageName,
			artefacts,
		},
	});
}

function buildStatusMessage(
	status: ReadinessStatus,
	missing: MissingArtefact[]
): string {
	if (status === 'ready' || missing.length === 0) {
		return 'Release pack artefacts detected.';
	}

	const [first] = missing;
	const artefact = first?.artefacts[0];

	if (!first || !artefact) {
		return 'Release pack artefacts missing.';
	}

	return `Missing build artefact ${artefact} for ${first.entry.packageName}.`;
}

export function createReleasePackReadinessHelper(
	options: ReleasePackHelperOptions = {}
) {
	const manifest = options.manifest ?? DEFAULT_MANIFEST;
	const dependencies = {
		...defaultDependencies(),
		...options.dependencies,
	} satisfies ReleasePackDependencies;
	const metricsOverride = options.metricsPath;

	return createReadinessHelper<ReleasePackState>({
		key: 'release-pack',
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<ReleasePackState>> {
			const detectionStart = dependencies.now();
			const repoRoot = await resolveRepoRoot(
				context.environment.projectRoot,
				dependencies.access
			);
			const missing = await detectMissingArtefacts(
				repoRoot,
				manifest,
				dependencies
			);
			const status: ReadinessStatus =
				missing.length === 0 ? 'ready' : 'pending';
			const detectionMs = Math.max(
				0,
				dependencies.now() - detectionStart
			);
			const recordedAt = dependencies.createDate().toISOString();
			const metricsPath = resolveMetricsPath(repoRoot, metricsOverride);
			const metrics = initialiseMetrics(
				manifest,
				detectionMs,
				recordedAt
			);

			return {
				status,
				state: {
					repoRoot,
					manifest,
					metrics,
					metricsPath,
				},
				message: buildStatusMessage(status, missing),
			};
		},
		async execute(
			_context: DxContext,
			state: ReleasePackState
		): Promise<{ state: ReleasePackState }> {
			let currentState = state;

			for (const entry of state.manifest) {
				currentState = await ensureEntryArtefacts(
					currentState,
					entry,
					dependencies
				);
			}

			return { state: currentState };
		},
		async confirm(
			_context: DxContext,
			state: ReleasePackState
		): Promise<ReadinessConfirmation<ReleasePackState>> {
			const missing = await detectMissingArtefacts(
				state.repoRoot,
				state.manifest,
				dependencies
			);
			const status = missing.length === 0 ? 'ready' : 'pending';
			const completedAt = dependencies.createDate().toISOString();
			const nextState: ReleasePackState = {
				...state,
				metrics: {
					...state.metrics,
					completedAt,
				},
			} satisfies ReleasePackState;

			await persistMetrics(nextState, dependencies);

			return {
				status,
				state: nextState,
				message: buildStatusMessage(status, missing),
			};
		},
	});
}
