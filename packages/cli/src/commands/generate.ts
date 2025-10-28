import path from 'node:path';
import { createHash as buildHash } from 'node:crypto';
import { Command, Option } from 'clipanion';
import { createReporter as buildReporter } from '@wpkernel/core/reporter';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { FileWriterSummary } from '../utils';
import { renderSummary } from './run-generate/summary';
import { validateGeneratedImports } from './run-generate/validation';
import { handleFailure } from './run-generate/errors';
import type { GenerationSummary } from './run-generate/types';
import { loadWPKernelConfig } from '../config';
import type { LoadedWPKernelConfig } from '../config/types';
import {
	buildWorkspace,
	toWorkspaceRelative,
	type Workspace,
	type FileManifest,
	type WriteOptions,
	type WriteJsonOptions,
	type RemoveOptions,
} from '../next/workspace';
import { createPipeline, type PipelineDiagnostic } from '../next/runtime';
import {
	registerCoreBuilders,
	registerCoreFragments,
} from '../next/ir/createIr';
import { buildAdapterExtensionsExtension } from '../next/runtime/adapterExtensions';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.generate`;
}

export interface BuildGenerateCommandOptions {
	readonly loadWPKernelConfig?: typeof loadWPKernelConfig;
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly createPipeline?: typeof createPipeline;
	readonly registerFragments?: typeof registerCoreFragments;
	readonly registerBuilders?: typeof registerCoreBuilders;
	readonly buildAdapterExtensionsExtension?: typeof buildAdapterExtensionsExtension;
	readonly buildReporter?: typeof buildReporter;
	readonly renderSummary?: typeof renderSummary;
	readonly validateGeneratedImports?: typeof validateGeneratedImports;
}

interface GenerateDependencies {
	readonly loadWPKernelConfig: typeof loadWPKernelConfig;
	readonly buildWorkspace: typeof buildWorkspace;
	readonly createPipeline: typeof createPipeline;
	readonly registerFragments: typeof registerCoreFragments;
	readonly registerBuilders: typeof registerCoreBuilders;
	readonly buildAdapterExtensionsExtension: typeof buildAdapterExtensionsExtension;
	readonly buildReporter: typeof buildReporter;
	readonly renderSummary: typeof renderSummary;
	readonly validateGeneratedImports: typeof validateGeneratedImports;
}

function mergeDependencies(
	options: BuildGenerateCommandOptions
): GenerateDependencies {
	return {
		loadWPKernelConfig,
		buildWorkspace,
		createPipeline,
		registerFragments: registerCoreFragments,
		registerBuilders: registerCoreBuilders,
		buildAdapterExtensionsExtension,
		buildReporter,
		renderSummary,
		validateGeneratedImports,
		...options,
	} satisfies GenerateDependencies;
}

function resolveWorkspaceRoot(loaded: LoadedWPKernelConfig): string {
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

export function buildGenerateCommand(
	options: BuildGenerateCommandOptions = {}
): new () => Command & { summary: GenerationSummary | null } {
	const dependencies = mergeDependencies(options);

	class NextGenerateCommand extends Command {
		static override paths = [['generate']];

		static override usage = Command.Usage({
			description: 'Generate WP Kernel artifacts from wpk.config.*.',
			examples: [
				['Generate artifacts into .generated/', 'wpk generate'],
				[
					'Preview changes without writing files',
					'wpk generate --dry-run',
				],
				[
					'Verbose logging including per-file status',
					'wpk generate --verbose',
				],
			],
		});

		dryRun = Option.Boolean('--dry-run', false);
		verbose = Option.Boolean('--verbose', false);

		public summary: GenerationSummary | null = null;

		override async execute(): Promise<WPKExitCode> {
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			this.summary = null;

			try {
				const loaded = await dependencies.loadWPKernelConfig();
				const workspaceRoot = resolveWorkspaceRoot(loaded);
				const baseWorkspace =
					dependencies.buildWorkspace(workspaceRoot);
				const { workspace, summary } = createTrackedWorkspace(
					baseWorkspace,
					{ dryRun: this.dryRun }
				);

				const pipeline = dependencies.createPipeline();
				dependencies.registerFragments(pipeline);
				dependencies.registerBuilders(pipeline);
				pipeline.extensions.use(
					dependencies.buildAdapterExtensionsExtension()
				);

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
						reporter,
					});

					logDiagnostics(reporter, result.diagnostics);

					const writerSummary = summary.buildSummary();
					const generationSummary: GenerationSummary = {
						...writerSummary,
						dryRun: this.dryRun,
					};

					if (this.dryRun) {
						await workspace.rollback(transactionLabel);
					} else {
						await workspace.commit(transactionLabel);
					}

					reporter.info('Generation completed.', {
						dryRun: this.dryRun,
						counts: writerSummary.counts,
					});
					reporter.debug('Generated files.', {
						files: writerSummary.entries,
					});

					try {
						await dependencies.validateGeneratedImports({
							projectRoot: workspace.root,
							summary: generationSummary,
							reporter,
						});
					} catch (error) {
						return handleFailure(
							error,
							reporter,
							WPK_EXIT_CODES.UNEXPECTED_ERROR
						);
					}

					const output = dependencies.renderSummary(
						writerSummary,
						this.dryRun,
						this.verbose
					);
					this.context.stdout.write(output);

					this.summary = generationSummary;
					return WPK_EXIT_CODES.SUCCESS;
				} catch (error) {
					await safeRollback(workspace, transactionLabel);
					return handleFailure(
						error,
						reporter,
						WPK_EXIT_CODES.UNEXPECTED_ERROR
					);
				}
			} catch (error) {
				return handleFailure(
					error,
					reporter,
					WPK_EXIT_CODES.UNEXPECTED_ERROR
				);
			}
		}
	}

	return NextGenerateCommand;
}
