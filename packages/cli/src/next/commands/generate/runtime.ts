import path from 'node:path';
import { createHash as buildHash } from 'node:crypto';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_EXIT_CODES, type WPKExitCode } from '@wpkernel/core/contracts';
import { handleFailure } from '../../../commands/run-generate/errors';
import { renderSummary } from '../../../commands/run-generate/summary';
import { validateGeneratedImports } from '../../../commands/run-generate/validation';
import type { GenerationSummary } from '../../../commands/run-generate/types';
import { loadKernelConfig } from '../../../config';
import type { LoadedKernelConfig } from '../../../config/types';
import {
	buildWorkspace,
	toWorkspaceRelative,
	type Workspace,
	type FileManifest,
	type WriteOptions,
	type WriteJsonOptions,
	type RemoveOptions,
} from '../../workspace';
import { createPipeline, type PipelineDiagnostic } from '../../runtime';
import { registerCoreBuilders, registerCoreFragments } from '../../ir/createIr';
import { buildAdapterExtensionsExtension } from '../../runtime/adapterExtensions';
import type { FileWriterSummary } from '../../../utils';

export interface BuildGenerateCommandOptions {
	readonly loadKernelConfig?: typeof loadKernelConfig;
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly createPipeline?: typeof createPipeline;
	readonly registerFragments?: typeof registerCoreFragments;
	readonly registerBuilders?: typeof registerCoreBuilders;
	readonly buildAdapterExtensionsExtension?: typeof buildAdapterExtensionsExtension;
	readonly renderSummary?: typeof renderSummary;
	readonly validateGeneratedImports?: typeof validateGeneratedImports;
}

export interface GenerateDependencies {
	readonly loadKernelConfig: typeof loadKernelConfig;
	readonly buildWorkspace: typeof buildWorkspace;
	readonly createPipeline: typeof createPipeline;
	readonly registerFragments: typeof registerCoreFragments;
	readonly registerBuilders: typeof registerCoreBuilders;
	readonly buildAdapterExtensionsExtension: typeof buildAdapterExtensionsExtension;
	readonly renderSummary: typeof renderSummary;
	readonly validateGeneratedImports: typeof validateGeneratedImports;
}

export interface GenerationRunOptions {
	readonly reporter: Reporter;
	readonly verbose: boolean;
	readonly dryRun: boolean;
	readonly stdout: NodeJS.WritableStream;
}

export interface GenerationRunResult {
	readonly exitCode: WPKExitCode;
	readonly summary: GenerationSummary | null;
	readonly output: string | null;
}

interface SummaryBuilderOptions {
	readonly workspace: Workspace;
	readonly dryRun: boolean;
}

interface SummaryRecord {
	path: string;
	originalHash: string | null;
	finalHash: string;
}

class SummaryBuilder {
	readonly #workspace: Workspace;
	readonly #dryRun: boolean;
	readonly #records = new Map<string, SummaryRecord>();

	constructor(options: SummaryBuilderOptions) {
		this.#workspace = options.workspace;
		this.#dryRun = options.dryRun;
	}

	async recordWrite(absolutePath: string, data: Buffer): Promise<void> {
		const key = path.resolve(absolutePath);
		const existing = this.#records.get(key);
		const finalHash = hashBuffer(data);

		if (existing) {
			existing.finalHash = finalHash;
			return;
		}

		const previous = await this.#workspace.read(absolutePath);
		this.#records.set(key, {
			path: toWorkspaceRelative(this.#workspace, absolutePath),
			originalHash: previous ? hashBuffer(previous) : null,
			finalHash,
		});
	}

	buildSummary(): FileWriterSummary {
		const entries = Array.from(this.#records.values())
			.map((record) => buildEntry(record, this.#dryRun))
			.sort((a, b) => a.path.localeCompare(b.path));

		const counts: FileWriterSummary['counts'] = {
			written: 0,
			unchanged: 0,
			skipped: 0,
		};

		for (const entry of entries) {
			counts[entry.status] += 1;
		}

		return { counts, entries } satisfies FileWriterSummary;
	}
}

class TrackingWorkspace implements Workspace {
	readonly #base: Workspace;
	readonly #summary: SummaryBuilder;

	constructor(base: Workspace, summary: SummaryBuilder) {
		this.#base = base;
		this.#summary = summary;
	}

	get root(): string {
		return this.#base.root;
	}

	cwd(): string {
		return this.#base.cwd();
	}

	resolve(...parts: string[]): string {
		return this.#base.resolve(...parts);
	}

	read(file: string): Promise<Buffer | null> {
		return this.#base.read(file);
	}

	readText(file: string): Promise<string | null> {
		return this.#base.readText(file);
	}

	async write(
		file: string,
		data: Buffer | string,
		options?: WriteOptions
	): Promise<void> {
		const absolute = this.#base.resolve(file);
		await this.#summary.recordWrite(absolute, ensureBuffer(data));
		await this.#base.write(file, data, options);
	}

	async writeJson<T>(
		file: string,
		value: T,
		options?: WriteJsonOptions
	): Promise<void> {
		const spacing = options?.pretty ? 2 : undefined;
		const serialised = JSON.stringify(value, null, spacing);
		const absolute = this.#base.resolve(file);
		await this.#summary.recordWrite(
			absolute,
			Buffer.from(serialised, 'utf8')
		);
		await this.#base.writeJson(file, value, options);
	}

	rm(target: string, options?: RemoveOptions): Promise<void> {
		return this.#base.rm(target, options);
	}

	exists(target: string): Promise<boolean> {
		return this.#base.exists(target);
	}

	glob(pattern: string | readonly string[]): Promise<string[]> {
		return this.#base.glob(pattern);
	}

	threeWayMerge(
		file: string,
		base: string,
		current: string,
		incoming: string,
		options?: Parameters<Workspace['threeWayMerge']>[4]
	): Promise<'clean' | 'conflict'> {
		return this.#base.threeWayMerge(file, base, current, incoming, options);
	}

	begin(label?: string): void {
		this.#base.begin(label);
	}

	commit(label?: string): Promise<FileManifest> {
		return this.#base.commit(label);
	}

	rollback(label?: string): Promise<FileManifest> {
		return this.#base.rollback(label);
	}

	dryRun<T>(
		fn: () => Promise<T>
	): Promise<{ result: T; manifest: FileManifest }> {
		return this.#base.dryRun(fn);
	}

	tmpDir(prefix?: string): Promise<string> {
		return this.#base.tmpDir(prefix);
	}

	buildSummary(): FileWriterSummary {
		return this.#summary.buildSummary();
	}
}

export function mergeDependencies(
	options: BuildGenerateCommandOptions
): GenerateDependencies {
	return {
		loadKernelConfig,
		buildWorkspace,
		createPipeline,
		registerFragments: registerCoreFragments,
		registerBuilders: registerCoreBuilders,
		buildAdapterExtensionsExtension,
		renderSummary,
		validateGeneratedImports,
		...options,
	} satisfies GenerateDependencies;
}

export async function runGeneration(
	dependencies: GenerateDependencies,
	options: GenerationRunOptions
): Promise<GenerationRunResult> {
	try {
		const loaded = await dependencies.loadKernelConfig();
		const workspaceRoot = resolveWorkspaceRoot(loaded);
		const baseWorkspace = dependencies.buildWorkspace(workspaceRoot);
		const { workspace, summary } = createTrackedWorkspace(baseWorkspace, {
			dryRun: options.dryRun,
		});

		const pipeline = dependencies.createPipeline();
		dependencies.registerFragments(pipeline);
		dependencies.registerBuilders(pipeline);
		pipeline.extensions.use(dependencies.buildAdapterExtensionsExtension());

		const transactionLabel = 'generate';
		workspace.begin(transactionLabel);

		try {
			const result = await pipeline.run({
				phase: 'generate',
				config: loaded.config,
				namespace: loaded.namespace,
				origin: loaded.configOrigin,
				sourcePath: loaded.sourcePath,
				workspace,
				reporter: options.reporter,
			});

			logDiagnostics(options.reporter, result.diagnostics);

			const writerSummary = summary.buildSummary();
			const generationSummary: GenerationSummary = {
				...writerSummary,
				dryRun: options.dryRun,
			};

			if (options.dryRun) {
				await workspace.rollback(transactionLabel);
			} else {
				await workspace.commit(transactionLabel);
			}

			options.reporter.info('Generation completed.', {
				dryRun: options.dryRun,
				counts: writerSummary.counts,
			});
			options.reporter.debug('Generated files.', {
				files: writerSummary.entries,
			});

			try {
				await dependencies.validateGeneratedImports({
					projectRoot: workspace.root,
					summary: generationSummary,
					reporter: options.reporter,
				});
			} catch (error) {
				const exitCode = handleFailure(
					error,
					options.reporter,
					WPK_EXIT_CODES.UNEXPECTED_ERROR
				);
				return {
					exitCode,
					summary: generationSummary,
					output: null,
				} satisfies GenerationRunResult;
			}

			const output = dependencies.renderSummary(
				writerSummary,
				options.dryRun,
				options.verbose
			);

			options.stdout.write(output);

			return {
				exitCode: WPK_EXIT_CODES.SUCCESS,
				summary: generationSummary,
				output,
			} satisfies GenerationRunResult;
		} catch (error) {
			await safeRollback(workspace, transactionLabel);
			const exitCode = handleFailure(
				error,
				options.reporter,
				WPK_EXIT_CODES.UNEXPECTED_ERROR
			);
			return {
				exitCode,
				summary: null,
				output: null,
			} satisfies GenerationRunResult;
		}
	} catch (error) {
		const exitCode = handleFailure(
			error,
			options.reporter,
			WPK_EXIT_CODES.UNEXPECTED_ERROR
		);
		return {
			exitCode,
			summary: null,
			output: null,
		} satisfies GenerationRunResult;
	}
}

function resolveWorkspaceRoot(loaded: LoadedKernelConfig): string {
	return path.dirname(loaded.sourcePath);
}

function logDiagnostics(
	reporter: Reporter,
	diagnostics: readonly PipelineDiagnostic[]
): void {
	for (const diagnostic of diagnostics) {
		reporter.warn('Pipeline diagnostic reported.', {
			key: diagnostic.key,
			mode: diagnostic.mode,
			message: diagnostic.message,
			helpers: diagnostic.helpers,
		});
	}
}

function createTrackedWorkspace(
	workspace: Workspace,
	options: { dryRun: boolean }
): { workspace: Workspace; summary: SummaryBuilder } {
	const summary = new SummaryBuilder({
		workspace,
		dryRun: options.dryRun,
	});

	return {
		workspace: new TrackingWorkspace(workspace, summary),
		summary,
	};
}

async function safeRollback(
	workspace: Workspace,
	label: string
): Promise<void> {
	try {
		await workspace.rollback(label);
	} catch (error) {
		if (error) {
			// ignore rollback failures to avoid masking original error
		}
	}
}

function buildEntry(
	record: SummaryRecord,
	dryRun: boolean
): FileWriterSummary['entries'][number] {
	const hasChanged =
		record.originalHash === null
			? record.finalHash.length > 0
			: record.finalHash !== record.originalHash;

	let status: FileWriterSummary['entries'][number]['status'];

	if (!hasChanged) {
		status = 'unchanged';
	} else if (dryRun) {
		status = 'skipped';
	} else {
		status = 'written';
	}

	return {
		path: record.path,
		status,
		hash: record.finalHash,
		reason: status === 'skipped' ? 'dry-run' : undefined,
	} satisfies FileWriterSummary['entries'][number];
}

function hashBuffer(buffer: Buffer): string {
	return buildHash('sha256').update(buffer).digest('hex');
}

function ensureBuffer(data: Buffer | string): Buffer {
	if (Buffer.isBuffer(data)) {
		return Buffer.from(data);
	}

	return Buffer.from(data, 'utf8');
}
