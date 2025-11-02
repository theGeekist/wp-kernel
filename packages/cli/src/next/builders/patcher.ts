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

const execFileAsync = promisify(execFile);

const PATCH_PLAN_PATH = path.posix.join('.wpk', 'apply', 'plan.json');
const PATCH_MANIFEST_PATH = path.posix.join('.wpk', 'apply', 'manifest.json');

function normaliseRelativePath(file: string): string {
	const replaced = file.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);

	if (normalised === '.' || normalised === '') {
		return '';
	}

	return normalised.replace(/^\.\//, '').replace(/^\/+/, '');
}

type PatchInstruction =
	| {
			readonly action?: 'write';
			readonly file: string;
			readonly base: string;
			readonly incoming: string;
			readonly description?: string;
	  }
	| {
			readonly action: 'delete';
			readonly file: string;
			readonly description?: string;
	  };

interface PatchPlan {
	readonly instructions: readonly PatchInstruction[];
}

type PatchStatus = 'applied' | 'conflict' | 'skipped';

interface PatchRecord {
	readonly file: string;
	readonly status: PatchStatus;
	readonly description?: string;
	readonly details?: Record<string, unknown>;
}

interface PatchManifest {
	readonly summary: {
		applied: number;
		conflicts: number;
		skipped: number;
	};
	readonly records: PatchRecord[];
	actions: string[];
}

interface ProcessInstructionOptions {
	readonly workspace: Workspace;
	readonly instruction: PatchInstruction;
	readonly manifest: PatchManifest;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly deletedFiles: string[];
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
		return { status: 'clean', result: stdout };
	} catch (error) {
		const execError = error as NodeJS.ErrnoException & {
			code?: number | string;
			stdout?: string;
			stderr?: string;
		};

		const isMergeConflict =
			(typeof execError.code === 'number' && execError.code === 1) ||
			(typeof execError.code === 'string' && execError.code === '1');

		if (isMergeConflict && typeof execError.stdout === 'string') {
			return { status: 'conflict', result: execError.stdout };
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

export function createPatcher(): BuilderHelper {
	return createHelper({
		key: 'builder.apply.patch.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'apply') {
				reporter.debug('createPatcher: skipping phase.', {
					phase: input.phase,
				});
				return;
			}

			const plan = await readPlan(context.workspace);

			if (!plan || plan.instructions.length === 0) {
				reporter.debug('createPatcher: no patch instructions found.');
				return;
			}

			const manifest = buildEmptyManifest();

			const deletedFiles: string[] = [];

			for (const instruction of plan.instructions) {
				await processInstruction({
					workspace: context.workspace,
					instruction,
					manifest,
					output,
					reporter,
					deletedFiles,
				});
			}

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

			reporter.info('createPatcher: completed patch application.', {
				summary: manifest.summary,
			});
		},
	});
}

async function processInstruction({
	workspace,
	instruction,
	manifest,
	output,
	reporter,
	deletedFiles,
}: ProcessInstructionOptions): Promise<void> {
	if (instruction.action === 'delete') {
		await processDeleteInstruction({
			workspace,
			instruction,
			manifest,
			reporter,
			deletedFiles,
		});
		return;
	}

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

	const current = (await workspace.readText(file)) ?? '';

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

interface ProcessDeleteInstructionOptions {
	readonly workspace: Workspace;
	readonly instruction: Extract<PatchInstruction, { action: 'delete' }>;
	readonly manifest: PatchManifest;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly deletedFiles: string[];
}

async function processDeleteInstruction({
	workspace,
	instruction,
	manifest,
	reporter,
	deletedFiles,
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
		return;
	}

	const exists = await workspace.exists(file);
	if (!exists) {
		reporter.debug('createPatcher: deletion target already absent.', {
			file,
		});
		recordResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'missing-target', action: 'delete' },
		});
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
