import fs from 'node:fs/promises';
import path from 'node:path';
import { Command, Option } from 'clipanion';
import { createReporter as buildReporter } from '@wpkernel/core/reporter';
import {
	WPKernelError,
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type SerializedError,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { BuilderOutput } from '../runtime/types';
import type { LoadedWPKernelConfig } from '../../config/types';
import { loadWPKernelConfig } from '../../config';
import { buildWorkspace, promptConfirm } from '../workspace';
import type { FileManifest, Workspace } from '../workspace';
import { createPatcher } from '../builders';
import {
	determineExitCode,
	reportFailure,
	serialiseError,
} from './apply/errors';

export const PATCH_MANIFEST_PATH = path.posix.join(
	'.wpk',
	'apply',
	'manifest.json'
);

export interface PatchManifestSummary {
	readonly applied: number;
	readonly conflicts: number;
	readonly skipped: number;
}

export type PatchStatus = 'applied' | 'conflict' | 'skipped';

export interface PatchRecord {
	readonly file: string;
	readonly status: PatchStatus;
	readonly description?: string;
	readonly details?: Record<string, unknown>;
}

export interface PatchManifest {
	readonly summary: PatchManifestSummary;
	readonly records: PatchRecord[];
	readonly actions: readonly string[];
}

export const APPLY_LOG_PATH = '.wpk-apply.log';

export type ApplyLogStatus =
	| 'success'
	| 'conflict'
	| 'skipped'
	| 'cancelled'
	| 'failed';

export interface ApplyLogEntry {
	readonly version: 1;
	readonly timestamp: string;
	readonly status: ApplyLogStatus;
	readonly exitCode: WPKExitCode;
	readonly flags: {
		readonly yes: boolean;
		readonly backup: boolean;
		readonly force: boolean;
	};
	readonly summary: PatchManifestSummary | null;
	readonly records: readonly PatchRecord[];
	readonly actions: readonly string[];
	readonly error?: SerializedError;
}

async function ensureGitRepository(workspace: Workspace): Promise<void> {
	const gitPath = workspace.resolve('.git');

	try {
		const stats = await fs.lstat(gitPath);
		if (stats.isDirectory() || stats.isFile()) {
			return;
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new WPKernelError('ValidationError', {
				message: 'Apply requires a git repository.',
				context: { path: '.git' },
			});
		}

		throw new WPKernelError('DeveloperError', {
			message: 'Unable to inspect git repository state.',
			context: {
				path: '.git',
				error: serialiseError(error),
			},
		});
	}

	throw new WPKernelError('ValidationError', {
		message: 'Apply requires a git repository.',
		context: { path: '.git' },
	});
}

function shouldBackupFile(pathname: string): boolean {
	if (!pathname || pathname === '.') {
		return false;
	}

	const normalised = pathname.split('\\').join('/');

	if (normalised === APPLY_LOG_PATH) {
		return false;
	}

	if (normalised.startsWith('.wpk/')) {
		return false;
	}

	if (normalised.startsWith('.tmp/')) {
		return false;
	}

	if (normalised.endsWith('/')) {
		return false;
	}

	return true;
}

export interface CreateBackupsOptions {
	readonly workspace: Workspace;
	readonly manifest: FileManifest;
	readonly reporter: ReturnType<typeof buildReporter>;
}

export async function createBackups({
	workspace,
	manifest,
	reporter,
}: CreateBackupsOptions): Promise<void> {
	const candidates = new Set(
		[...manifest.writes, ...manifest.deletes].filter(shouldBackupFile)
	);

	if (candidates.size === 0) {
		return;
	}

	for (const file of candidates) {
		const contents = await workspace.read(file);
		if (!contents) {
			continue;
		}

		const backupPath = `${file}.bak`;
		await workspace.write(backupPath, contents, { ensureDir: true });
		reporter.info('Created workspace backup.', { file: backupPath });
	}
}

export async function appendApplyLog(
	workspace: Workspace,
	entry: ApplyLogEntry
): Promise<void> {
	const previous = await workspace.readText(APPLY_LOG_PATH);
	const serialised = JSON.stringify(entry);
	const trimmedPrevious = previous?.replace(/\s+$/, '') ?? '';
	const nextContents =
		trimmedPrevious.length > 0
			? `${trimmedPrevious}\n${serialised}\n`
			: `${serialised}\n`;

	await workspace.write(APPLY_LOG_PATH, nextContents, { ensureDir: true });
}

interface ApplyFlags {
	readonly yes: boolean;
	readonly backup: boolean;
	readonly force: boolean;
}

function resolveFlags(command: {
	yes: boolean | undefined;
	backup: boolean | undefined;
	force: boolean | undefined;
}): ApplyFlags {
	return {
		yes: command.yes === true,
		backup: command.backup === true,
		force: command.force === true,
	};
}

interface PreviewResult {
	readonly manifest: PatchManifest | null;
	readonly workspaceManifest: FileManifest;
}

interface PreviewOptions {
	readonly dependencies: ApplyCommandDependencies;
	readonly workspace: Workspace;
	readonly loaded: LoadedWPKernelConfig;
}

async function previewPatches({
	dependencies,
	workspace,
	loaded,
}: PreviewOptions): Promise<PreviewResult> {
	const previewReporter = dependencies.buildReporter({
		namespace: `${buildReporterNamespace()}.preview`,
		level: 'info',
		enabled: false,
	});
	const previewBuilder = dependencies.createPatcher();
	const previewOutput = dependencies.buildBuilderOutput();

	const { result, manifest } = await workspace.dryRun(async () => {
		await previewBuilder.apply(
			{
				context: {
					workspace,
					reporter: previewReporter,
					phase: 'apply' as const,
				},
				input: {
					phase: 'apply' as const,
					options: {
						config: loaded.config,
						namespace: loaded.namespace,
						origin: loaded.configOrigin,
						sourcePath: loaded.sourcePath,
					},
					ir: null,
				},
				output: previewOutput,
				reporter: previewReporter,
			},
			undefined
		);

		return dependencies.readManifest(workspace);
	});

	return {
		manifest: result,
		workspaceManifest: manifest,
	} satisfies PreviewResult;
}

interface ApplyExecutionOptions {
	readonly dependencies: ApplyCommandDependencies;
	readonly workspace: Workspace;
	readonly loaded: LoadedWPKernelConfig;
	readonly reporter: ReturnType<typeof buildReporter>;
}

async function executeApply({
	dependencies,
	workspace,
	loaded,
	reporter,
}: ApplyExecutionOptions): Promise<PatchManifest> {
	const builder = dependencies.createPatcher();
	const output = dependencies.buildBuilderOutput();

	await builder.apply(
		{
			context: {
				workspace,
				reporter,
				phase: 'apply' as const,
			},
			input: {
				phase: 'apply' as const,
				options: {
					config: loaded.config,
					namespace: loaded.namespace,
					origin: loaded.configOrigin,
					sourcePath: loaded.sourcePath,
				},
				ir: null,
			},
			output,
			reporter,
		},
		undefined
	);

	const manifest = await dependencies.readManifest(workspace);
	if (!manifest) {
		throw new WPKernelError('DeveloperError', {
			message: 'Apply manifest missing after patch execution.',
		});
	}

	return manifest;
}

type ApplyCommandInstance = Command & {
	summary: PatchManifestSummary | null;
	records: PatchRecord[];
	manifest: PatchManifest | null;
};

interface NoManifestOptions {
	readonly command: ApplyCommandInstance;
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReturnType<typeof buildReporter>;
	readonly flags: ApplyFlags;
}

async function handleNoManifest({
	command,
	workspace,
	dependencies,
	reporter,
	flags,
}: NoManifestOptions): Promise<WPKExitCode> {
	const message = 'No apply manifest produced - nothing to patch.';
	const summary: PatchManifestSummary = {
		applied: 0,
		conflicts: 0,
		skipped: 0,
	};
	command.summary = summary;
	command.records = [];
	command.manifest = null;
	reporter.info(message);
	command.context.stdout.write(`${message}\n`);

	await dependencies.appendApplyLog(workspace, {
		version: 1,
		timestamp: new Date().toISOString(),
		status: 'skipped',
		exitCode: WPK_EXIT_CODES.SUCCESS,
		flags,
		summary,
		records: [],
		actions: [],
	});

	return WPK_EXIT_CODES.SUCCESS;
}

interface CancellationOptions {
	readonly command: ApplyCommandInstance;
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReturnType<typeof buildReporter>;
	readonly flags: ApplyFlags;
}

async function handleCancellation({
	command,
	workspace,
	dependencies,
	reporter,
	flags,
}: CancellationOptions): Promise<WPKExitCode> {
	reporter.info('Apply cancelled by user.');
	command.summary = null;
	command.records = [];
	command.manifest = null;
	command.context.stdout.write('Apply cancelled.\n');

	await dependencies.appendApplyLog(workspace, {
		version: 1,
		timestamp: new Date().toISOString(),
		status: 'cancelled',
		exitCode: WPK_EXIT_CODES.SUCCESS,
		flags,
		summary: null,
		records: [],
		actions: [],
	});

	return WPK_EXIT_CODES.SUCCESS;
}

interface CompletionOptions {
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReturnType<typeof buildReporter>;
	readonly manifest: PatchManifest;
	readonly flags: ApplyFlags;
}

async function handleCompletion({
	workspace,
	dependencies,
	reporter,
	manifest,
	flags,
}: CompletionOptions): Promise<WPKExitCode> {
	const baseEntry = {
		version: 1 as const,
		timestamp: new Date().toISOString(),
		flags,
		summary: manifest.summary,
		records: manifest.records,
		actions: manifest.actions,
	} satisfies Omit<ApplyLogEntry, 'status' | 'exitCode'>;

	if (manifest.summary.conflicts > 0) {
		reporter.warn('Apply completed with conflicts.', {
			summary: manifest.summary,
			flags,
		});

		const exitCode = flags.force
			? WPK_EXIT_CODES.SUCCESS
			: WPK_EXIT_CODES.VALIDATION_ERROR;

		if (flags.force) {
			reporter.info('Conflicts detected but continuing due to --force.', {
				summary: manifest.summary,
			});
		}

		await dependencies.appendApplyLog(workspace, {
			...baseEntry,
			status: 'conflict',
			exitCode,
		});

		return exitCode;
	}

	reporter.info('Apply completed.', {
		summary: manifest.summary,
		flags,
	});

	await dependencies.appendApplyLog(workspace, {
		...baseEntry,
		status: 'success',
		exitCode: WPK_EXIT_CODES.SUCCESS,
	});

	return WPK_EXIT_CODES.SUCCESS;
}

interface FailureLogOptions {
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly flags: ApplyFlags;
	readonly exitCode: WPKExitCode;
	readonly error: unknown;
}

async function handleFailureLog({
	workspace,
	dependencies,
	flags,
	exitCode,
	error,
}: FailureLogOptions): Promise<void> {
	await dependencies
		.appendApplyLog(workspace, {
			version: 1,
			timestamp: new Date().toISOString(),
			status: 'failed',
			exitCode,
			flags,
			summary: null,
			records: [],
			actions: [],
			error: serialiseError(error),
		})
		.catch(() => undefined);
}

interface WorkspaceSetupOptions {
	readonly dependencies: ApplyCommandDependencies;
}

interface WorkspaceSetupResult {
	readonly workspace: Workspace;
	readonly loaded: LoadedWPKernelConfig;
}

async function initialiseWorkspace({
	dependencies,
}: WorkspaceSetupOptions): Promise<WorkspaceSetupResult> {
	const loaded = await dependencies.loadWPKernelConfig();
	const workspaceRoot = dependencies.resolveWorkspaceRoot(loaded);
	const workspace = dependencies.buildWorkspace(workspaceRoot);

	await dependencies.ensureGitRepository(workspace);

	return { workspace, loaded } satisfies WorkspaceSetupResult;
}

interface PreviewStageOptions {
	readonly command: ApplyCommandInstance;
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReturnType<typeof buildReporter>;
	readonly flags: ApplyFlags;
	readonly preview: PreviewResult;
}

async function processPreviewStage({
	command,
	workspace,
	dependencies,
	reporter,
	flags,
	preview,
}: PreviewStageOptions): Promise<WPKExitCode | null> {
	if (!preview.manifest) {
		return handleNoManifest({
			command,
			workspace,
			dependencies,
			reporter,
			flags,
		});
	}

	if (flags.yes) {
		return null;
	}

	const confirmed = await confirmApplyRun({
		command,
		dependencies,
		manifest: preview.manifest,
	});

	if (!confirmed) {
		return handleCancellation({
			command,
			workspace,
			dependencies,
			reporter,
			flags,
		});
	}

	return null;
}

interface ConfirmApplyOptions {
	readonly command: ApplyCommandInstance;
	readonly dependencies: ApplyCommandDependencies;
	readonly manifest: PatchManifest;
}

async function confirmApplyRun({
	command,
	dependencies,
	manifest,
}: ConfirmApplyOptions): Promise<boolean> {
	const message = buildConfirmationMessage(manifest);

	return dependencies.promptConfirm({
		message,
		defaultValue: false,
		input: command.context.stdin,
		output: command.context.stdout,
	});
}

function buildConfirmationMessage(manifest: PatchManifest): string {
	const { applied, conflicts } = manifest.summary;
	const promptBits = [
		`Apply ${applied} change${applied === 1 ? '' : 's'} to the workspace`,
	];

	if (conflicts > 0) {
		promptBits.push(
			`(${conflicts} potential conflict${conflicts === 1 ? '' : 's'})`
		);
	}

	return `${promptBits.join(' ')}?`;
}

export function buildBuilderOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite(action) {
			actions.push(action);
		},
	};
}

export async function readManifest(
	workspace: Workspace
): Promise<PatchManifest | null> {
	const raw = await workspace.readText(PATCH_MANIFEST_PATH);
	if (!raw) {
		return null;
	}

	try {
		const data = JSON.parse(raw) as PatchManifest;
		if (!data.summary || !Array.isArray(data.records)) {
			throw new Error('Missing summary or records.');
		}

		return {
			summary: {
				applied: Number(data.summary.applied) || 0,
				conflicts: Number(data.summary.conflicts) || 0,
				skipped: Number(data.summary.skipped) || 0,
			},
			records: data.records.map((record) => ({
				file: String(record.file ?? ''),
				status: (record.status ?? 'skipped') as PatchStatus,
				description:
					typeof record.description === 'string'
						? record.description
						: undefined,
				details:
					typeof record.details === 'object' && record.details
						? record.details
						: undefined,
			})),
			actions: Array.isArray((data as { actions?: unknown }).actions)
				? ((data as { actions?: unknown }).actions as unknown[])
						.map((value) => String(value ?? ''))
						.filter((value) => value.length > 0)
				: [],
		} satisfies PatchManifest;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse apply manifest.',
			context: {
				file: PATCH_MANIFEST_PATH,
				error: (error as Error).message,
			},
		});
	}
}

export function formatManifest(manifest: PatchManifest): string {
	const lines = [
		'Apply summary:',
		`  Applied: ${manifest.summary.applied}`,
		`  Conflicts: ${manifest.summary.conflicts}`,
		`  Skipped: ${manifest.summary.skipped}`,
	];

	if (manifest.records.length > 0) {
		lines.push('', 'Records:');
		for (const record of manifest.records) {
			const description = record.description
				? ` — ${record.description}`
				: '';
			lines.push(`- [${record.status}] ${record.file}${description}`);
		}
	} else {
		lines.push('', 'No files were patched.');
	}

	return `${lines.join('\n')}\n`;
}

export function resolveWorkspaceRoot(loaded: LoadedWPKernelConfig): string {
	return path.dirname(loaded.sourcePath);
}

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.next.apply`;
}

export interface BuildApplyCommandOptions {
	readonly loadWPKernelConfig?: typeof loadWPKernelConfig;
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly createPatcher?: typeof createPatcher;
	readonly buildReporter?: typeof buildReporter;
	readonly buildBuilderOutput?: typeof buildBuilderOutput;
	readonly readManifest?: typeof readManifest;
	readonly resolveWorkspaceRoot?: typeof resolveWorkspaceRoot;
	readonly promptConfirm?: typeof promptConfirm;
	readonly ensureGitRepository?: typeof ensureGitRepository;
	readonly createBackups?: typeof createBackups;
	readonly appendApplyLog?: typeof appendApplyLog;
}

type ApplyCommandDependencies = Required<BuildApplyCommandOptions>;

export type ApplyCommandConstructor = new () => Command & {
	summary: PatchManifestSummary | null;
	records: PatchRecord[];
	manifest: PatchManifest | null;
};

function mergeDependencies(
	options: BuildApplyCommandOptions
): ApplyCommandDependencies {
	return {
		loadWPKernelConfig,
		buildWorkspace,
		createPatcher,
		buildReporter,
		buildBuilderOutput,
		readManifest,
		resolveWorkspaceRoot,
		promptConfirm,
		ensureGitRepository,
		createBackups,
		appendApplyLog,
		...options,
	} satisfies ApplyCommandDependencies;
}

export function buildApplyCommand(
	options: BuildApplyCommandOptions = {}
): ApplyCommandConstructor {
	const dependencies = mergeDependencies(options);

	class NextApplyCommand extends Command {
		static override paths = [['apply']];

		static override usage = Command.Usage({
			description:
				'Apply pending workspace patches generated by the next pipeline.',
			examples: [['Apply pending patches', 'wpk apply']],
		});

		yes = Option.Boolean('--yes', false);
		backup = Option.Boolean('--backup', false);
		force = Option.Boolean('--force', false);

		public summary: PatchManifestSummary | null = null;
		public records: PatchRecord[] = [];
		public manifest: PatchManifest | null = null;

		override async execute(): Promise<WPKExitCode> {
			let workspace: Workspace | null = null;
			const flags = resolveFlags(this);
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			try {
				const { workspace: activeWorkspace, loaded } =
					await initialiseWorkspace({ dependencies });
				workspace = activeWorkspace;

				const preview = await previewPatches({
					dependencies,
					workspace: activeWorkspace,
					loaded,
				});

				const previewExit = await processPreviewStage({
					command: this,
					workspace: activeWorkspace,
					dependencies,
					reporter,
					flags,
					preview,
				});

				if (previewExit !== null) {
					return previewExit;
				}

				if (flags.backup) {
					await dependencies.createBackups({
						workspace: activeWorkspace,
						manifest: preview.workspaceManifest,
						reporter,
					});
				}

				const manifest = await executeApply({
					dependencies,
					workspace: activeWorkspace,
					loaded,
					reporter,
				});

				this.manifest = manifest;
				this.summary = manifest.summary;
				this.records = manifest.records;

				this.context.stdout.write(formatManifest(manifest));

				return handleCompletion({
					workspace: activeWorkspace,
					dependencies,
					reporter,
					manifest,
					flags,
				});
			} catch (error) {
				this.summary = null;
				this.records = [];
				this.manifest = null;
				reportFailure(
					reporter,
					'Failed to apply workspace patches.',
					error
				);
				const exitCode = determineExitCode(error);

				if (workspace) {
					await handleFailureLog({
						workspace,
						dependencies,
						flags,
						exitCode,
						error,
					});
				}

				return exitCode;
			}
		}
	}

	return NextApplyCommand as ApplyCommandConstructor;
}

export const NextApplyCommand = buildApplyCommand();
