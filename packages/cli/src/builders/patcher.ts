import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import {
	type PatchPlan,
	type PatchInstruction,
	type PatchManifest,
	type PatchRecord,
	type ProcessInstructionOptions,
	type PatchDeletionResult,
	type PatchPlanDeletionSkip,
	type ProcessDeleteInstructionOptions,
	type ProcessPlanInstructionsOptions,
	type RecordPlanSkippedDeletionsOptions,
	type ReportDeletionSummaryOptions,
} from './types';

const execFileAsync = promisify(execFile);

const PATCH_PLAN_PATH = path.posix.join('.wpk', 'apply', 'plan.json');
const PATCH_MANIFEST_PATH = path.posix.join('.wpk', 'apply', 'manifest.json');
const PATCH_BASE_ROOT = path.posix.join('.wpk', 'apply', 'base');

function normaliseRelativePath(file: string): string {
	const replaced = file.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);

	if (normalised === '.' || normalised === '') {
		return '';
	}

	return normalised.replace(/^\.\//, '').replace(/^\/+/, '');
}

async function readPlan(workspace: Workspace): Promise<PatchPlan | null> {
	const contents = await workspace.readText(PATCH_PLAN_PATH);
	if (!contents) {
		return null;
	}

	try {
		const data = JSON.parse(contents) as PatchPlan;
		const instructions = Array.isArray(data.instructions)
			? data.instructions
			: [];

		const normalised = instructions
			.map((entry) => normaliseInstruction(entry))
			.filter((entry): entry is PatchInstruction => entry !== null);

		return {
			instructions: normalised,
			skippedDeletions: normaliseSkippedDeletions(
				(data as { skippedDeletions?: unknown }).skippedDeletions
			),
		} satisfies PatchPlan;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse patch plan JSON.',
			context: {
				file: PATCH_PLAN_PATH,
				error: (error as Error).message,
			},
		});
	}
}

function normaliseInstruction(value: unknown): PatchInstruction | null {
	if (!isRecord(value) || typeof value.file !== 'string') {
		return null;
	}

	const action = value.action === 'delete' ? 'delete' : 'write';
	const file = value.file;
	const description =
		typeof value.description === 'string' ? value.description : undefined;

	if (action === 'delete') {
		return { action, file, description };
	}

	if (typeof value.base !== 'string' || typeof value.incoming !== 'string') {
		return null;
	}

	return {
		action,
		file,
		base: value.base,
		incoming: value.incoming,
		description,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normaliseSkippedDeletions(
	value: unknown
): readonly PatchPlanDeletionSkip[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const entries: PatchPlanDeletionSkip[] = [];
	for (const entry of value) {
		if (!isRecord(entry)) {
			continue;
		}

		const file = typeof entry.file === 'string' ? entry.file : '';
		if (!file) {
			continue;
		}

		const description =
			typeof entry.description === 'string'
				? entry.description
				: undefined;
		const reason =
			typeof entry.reason === 'string' ? entry.reason : undefined;

		entries.push({
			file: normaliseRelativePath(file),
			description,
			reason,
		});
	}

	return entries;
}

async function writeTempFile(
	workspace: Workspace,
	scope: string,
	relativePath: string,
	contents: string
): Promise<string> {
	const base = await workspace.tmpDir(scope);
	const safeRelative = normaliseRelativePath(relativePath) || 'patched-file';
	const absolute = path.join(base, safeRelative);
	await fs.mkdir(path.dirname(absolute), { recursive: true });
	await fs.writeFile(absolute, contents);
	return absolute;
}

async function mergeWithGit(
	workspace: Workspace,
	target: string,
	base: string,
	current: string,
	incoming: string
): Promise<{ status: 'clean' | 'conflict'; result: string }> {
	const safeName = target.replace(/[^a-zA-Z0-9.-]/g, '-');
	const baseFile = await writeTempFile(
		workspace,
		`patcher-base-${safeName}-`,
		target,
		base
	);
	const currentFile = await writeTempFile(
		workspace,
		`patcher-current-${safeName}-`,
		target,
		current
	);
	const incomingFile = await writeTempFile(
		workspace,
		`patcher-incoming-${safeName}-`,
		target,
		incoming
	);

	try {
		const { stdout } = await execFileAsync(
			'git',
			[
				'merge-file',
				'--stdout',
				'--diff3',
				currentFile,
				baseFile,
				incomingFile,
			],
			{
				encoding: 'utf8',
			}
		);
		const result =
			typeof stdout === 'string'
				? stdout
				: await fs.readFile(currentFile, 'utf8');
		return { status: 'clean', result };
	} catch (error) {
		const execError = error as NodeJS.ErrnoException & {
			code?: number | string;
			stdout?: string;
			stderr?: string;
		};

		const isMergeConflict =
			(typeof execError.code === 'number' && execError.code === 1) ||
			(typeof execError.code === 'string' && execError.code === '1');

		if (isMergeConflict) {
			const result =
				typeof execError.stdout === 'string'
					? execError.stdout
					: await fs.readFile(currentFile, 'utf8');
			return { status: 'conflict', result };
		}

		/* istanbul ignore next - defensive logging for unexpected git failures */
		throw new WPKernelError('DeveloperError', {
			message: 'git merge-file failed while computing patch.',
			context: {
				file: target,
				code: execError.code,
				stderr: execError.stderr,
			},
		});
	}
}

async function queueWorkspaceFile(
	workspace: Workspace,
	output: BuilderOutput,
	file: string
): Promise<void> {
	const contents = await workspace.read(file);
	if (!contents) {
		/* istanbul ignore next - queue helper defends against deleted targets */
		return;
	}

	output.queueWrite({
		file,
		contents,
	});
}

function buildEmptyManifest(): PatchManifest {
	return {
		summary: {
			applied: 0,
			conflicts: 0,
			skipped: 0,
		},
		records: [],
		actions: [],
	} satisfies PatchManifest;
}

function recordResult(manifest: PatchManifest, record: PatchRecord): void {
	manifest.records.push(record);

	switch (record.status) {
		case 'applied':
			manifest.summary.applied += 1;
			break;
		case 'conflict':
			manifest.summary.conflicts += 1;
			break;
		case 'skipped':
			manifest.summary.skipped += 1;
			break;
	}
}

function hasPlanInstructions(plan: PatchPlan | null): plan is PatchPlan {
	return Boolean(
		plan &&
			(plan.instructions.length > 0 || plan.skippedDeletions.length > 0)
	);
}

function recordPlanSkippedDeletions({
	manifest,
	plan,
	reporter,
}: RecordPlanSkippedDeletionsOptions): void {
	if (plan.skippedDeletions.length === 0) {
		return;
	}

	for (const skipped of plan.skippedDeletions) {
		recordResult(manifest, {
			file: normaliseRelativePath(skipped.file),
			status: 'skipped',
			description: skipped.description,
			details: {
				action: 'delete',
				reason: skipped.reason ?? 'guarded-by-plan',
			},
		});
	}

	reporter.info(
		'createPatcher: guarded shim deletions were recorded during planning.',
		{
			files: plan.skippedDeletions.map((entry) =>
				normaliseRelativePath(entry.file)
			),
		}
	);
}

async function processPlanInstructions({
	plan,
	workspace,
	manifest,
	output,
	reporter,
	deletedFiles,
	skippedDeletions,
}: ProcessPlanInstructionsOptions): Promise<void> {
	for (const instruction of plan.instructions) {
		await processInstruction({
			workspace,
			instruction,
			manifest,
			output,
			reporter,
			deletedFiles,
			skippedDeletions,
		});
	}
}

function reportDeletionSummary({
	plan,
	reporter,
	deletedFiles,
	skippedDeletions,
}: ReportDeletionSummaryOptions): void {
	if (deletedFiles.length > 0) {
		reporter.info('createPatcher: removed shim files.', {
			files: deletedFiles,
		});
	}

	const applySkipped = skippedDeletions.filter(
		(entry) =>
			!plan.skippedDeletions.some(
				(planned) => normaliseRelativePath(planned.file) === entry.file
			)
	);

	if (applySkipped.length > 0) {
		reporter.info(
			'createPatcher: skipped shim removals due to local modifications.',
			{
				files: applySkipped.map((entry) => entry.file),
			}
		);
	}
}

async function processInstruction({
	workspace,
	instruction,
	manifest,
	output,
	reporter,
	deletedFiles,
	skippedDeletions,
}: ProcessInstructionOptions): Promise<void> {
	if (instruction.action === 'delete') {
		await processDeleteInstruction({
			workspace,
			instruction,
			manifest,
			reporter,
			deletedFiles,
			skippedDeletions,
		});
		return;
	}

	await applyWriteInstruction({
		workspace,
		instruction,
		manifest,
		output,
		reporter,
	});
}

interface ProcessWriteInstructionOptions {
	readonly workspace: Workspace;
	readonly instruction: Exclude<PatchInstruction, { action: 'delete' }>;
	readonly manifest: PatchManifest;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
}

async function applyWriteInstruction({
	workspace,
	instruction,
	manifest,
	output,
	reporter,
}: ProcessWriteInstructionOptions): Promise<void> {
	const file = normaliseRelativePath(instruction.file);
	const basePath = normaliseRelativePath(instruction.base);
	const incomingPath = normaliseRelativePath(instruction.incoming);
	const description = instruction.description;

	const base = (await workspace.readText(basePath)) ?? '';
	const incoming = await workspace.readText(incomingPath);

	if (!file) {
		reporter.warn('createPatcher: skipping instruction with empty file.', {
			base: basePath,
			incoming: incomingPath,
		});
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'empty-target',
			},
		});
		return;
	}

	if (incoming === null) {
		reporter.warn('createPatcher: incoming file missing.', {
			file,
			source: incomingPath,
		});
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'missing-incoming',
			},
		});
		return;
	}

	const currentOriginal = await workspace.readText(file);
	if (
		await tryRestoreMissingOrEmptyTarget({
			currentOriginal,
			incoming,
			file,
			basePath,
			workspace,
			output,
			manifest,
			description,
			reporter,
		})
	) {
		return;
	}
	const current = currentOriginal ?? '';

	if (current === incoming) {
		reporter.debug('createPatcher: target already up-to-date.', { file });
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'no-op',
			},
		});
		return;
	}

	const { status, result } = await mergeWithGit(
		workspace,
		file,
		base,
		current,
		incoming
	);

	await workspace.write(file, result, { ensureDir: true });
	await queueWorkspaceFile(workspace, output, file);

	if (status === 'clean') {
		await workspace.write(basePath, incoming, { ensureDir: true });
		await queueWorkspaceFile(workspace, output, basePath);
	}

	recordResult(manifest, {
		file,
		status: status === 'clean' ? 'applied' : 'conflict',
		description,
	});

	if (status === 'conflict') {
		reporter.warn('createPatcher: merge conflict detected.', {
			file,
		});
		return;
	}

	reporter.debug('createPatcher: patch applied.', { file });
}

interface RestoreTargetOptions {
	readonly currentOriginal: string | null;
	readonly incoming: string;
	readonly file: string;
	readonly basePath: string;
	readonly workspace: Workspace;
	readonly output: BuilderOutput;
	readonly manifest: PatchManifest;
	readonly description?: string;
	readonly reporter: BuilderApplyOptions['reporter'];
}

async function tryRestoreMissingOrEmptyTarget({
	currentOriginal,
	incoming,
	file,
	basePath,
	workspace,
	output,
	manifest,
	description,
	reporter,
}: RestoreTargetOptions): Promise<boolean> {
	const targetMissingOrEmpty =
		currentOriginal === null || currentOriginal.trim().length === 0;
	if (!targetMissingOrEmpty || incoming.trim().length === 0) {
		return false;
	}

	await workspace.write(file, incoming, { ensureDir: true });
	await queueWorkspaceFile(workspace, output, file);

	await workspace.write(basePath, incoming, { ensureDir: true });
	await queueWorkspaceFile(workspace, output, basePath);

	recordResult(manifest, {
		file,
		status: 'applied',
		description,
	});
	reporter.debug(
		'createPatcher: target missing or empty, restored from incoming.',
		{ file }
	);
	return true;
}

async function processDeleteInstruction({
	workspace,
	instruction,
	manifest,
	reporter,
	deletedFiles,
	skippedDeletions,
}: ProcessDeleteInstructionOptions): Promise<void> {
	const file = normaliseRelativePath(instruction.file);
	const description = instruction.description;

	if (!file) {
		reporter.warn(
			'createPatcher: skipping deletion with empty file target.'
		);
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'empty-target', action: 'delete' },
		});
		skippedDeletions.push({ file, reason: 'empty-target' });
		return;
	}

	const basePath = path.posix.join(PATCH_BASE_ROOT, file);
	const [baseContents, currentContents] = await Promise.all([
		workspace.readText(basePath),
		workspace.readText(file),
	]);

	if (!baseContents) {
		reporter.debug(
			'createPatcher: base snapshot missing, skipping deletion.',
			{
				file,
				base: basePath,
			}
		);
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'missing-base',
				action: 'delete',
				base: basePath,
			},
		});
		skippedDeletions.push({ file, reason: 'missing-base' });
		return;
	}

	if (currentContents === null) {
		reporter.debug('createPatcher: deletion target already absent.', {
			file,
		});
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'missing-target', action: 'delete' },
		});
		skippedDeletions.push({ file, reason: 'missing-target' });
		return;
	}

	if (currentContents !== baseContents) {
		reporter.info(
			'createPatcher: detected manual changes, skipping shim deletion.',
			{ file }
		);
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'modified-target', action: 'delete' },
		});
		skippedDeletions.push({ file, reason: 'modified-target' });
		return;
	}

	await workspace.rm(file);
	deletedFiles.push(file);
	recordResult(manifest, {
		file,
		status: 'applied',
		description,
		details: { action: 'delete' },
	});
	reporter.debug('createPatcher: removed file via deletion instruction.', {
		file,
	});
}

/**
 * Creates a builder helper for applying patches to the workspace.
 *
 * This helper reads a patch plan, applies file modifications (writes, merges, deletions)
 * based on the plan, and records the outcome in a patch manifest.
 * It uses `git merge-file` for intelligent three-way merges to handle conflicts.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for applying patches.
 */
export function createPatcher(): BuilderHelper {
	return createHelper({
		key: 'builder.apply.patch.core',
		kind: 'builder',
		dependsOn: ['builder.generate.apply.plan'],
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			const supportedPhase =
				input.phase === 'generate' || input.phase === 'apply';
			if (!supportedPhase) {
				reporter.debug('createPatcher: skipping phase.', {
					phase: input.phase,
				});
				return;
			}

			const plan = await readPlan(context.workspace);

			if (!hasPlanInstructions(plan)) {
				reporter.debug('createPatcher: no patch instructions found.');
				return;
			}

			const manifest = buildEmptyManifest();
			const deletedFiles: string[] = [];
			const skippedDeletions: PatchDeletionResult[] = [];

			recordPlanSkippedDeletions({ manifest, plan, reporter });

			await processPlanInstructions({
				plan,
				workspace: context.workspace,
				manifest,
				output,
				reporter,
				deletedFiles,
				skippedDeletions,
			});

			const actionFiles = [
				...output.actions.map((action) => action.file),
				...deletedFiles,
				PATCH_MANIFEST_PATH,
			];
			manifest.actions = Array.from(new Set(actionFiles));

			await context.workspace.writeJson(PATCH_MANIFEST_PATH, manifest, {
				pretty: true,
			});
			await queueWorkspaceFile(
				context.workspace,
				output,
				PATCH_MANIFEST_PATH
			);

			reportDeletionSummary({
				plan,
				reporter,
				deletedFiles,
				skippedDeletions,
			});

			reporter.info('createPatcher: completed patch application.', {
				summary: manifest.summary,
			});
		},
	});
}
