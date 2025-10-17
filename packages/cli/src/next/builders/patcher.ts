import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { KernelError } from '@wpkernel/core/error';
import { createHelper } from '../helper';
import type { BuilderHelper, BuilderOutput } from '../runtime/types';
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

interface PatchInstruction {
	readonly file: string;
	readonly base: string;
	readonly incoming: string;
	readonly description?: string;
}

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
}

interface ProcessInstructionOptions {
	readonly workspace: Workspace;
	readonly instruction: PatchInstruction;
	readonly manifest: PatchManifest;
	readonly output: BuilderOutput;
	readonly reporter: Parameters<BuilderHelper['apply']>[0]['reporter'];
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

		return {
			instructions: instructions.filter(
				(entry): entry is PatchInstruction =>
					Boolean(entry?.file && entry?.incoming && entry?.base)
			),
		} satisfies PatchPlan;
	} catch (error) {
		throw new KernelError('DeveloperError', {
			message: 'Failed to parse patch plan JSON.',
			context: {
				file: PATCH_PLAN_PATH,
				error: (error as Error).message,
			},
		});
	}
}

async function createTempFile(
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
	const baseFile = await createTempFile(
		workspace,
		`patcher-base-${safeName}-`,
		target,
		base
	);
	const currentFile = await createTempFile(
		workspace,
		`patcher-current-${safeName}-`,
		target,
		current
	);
	const incomingFile = await createTempFile(
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
		throw new KernelError('DeveloperError', {
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

function createEmptyManifest(): PatchManifest {
	return {
		summary: {
			applied: 0,
			conflicts: 0,
			skipped: 0,
		},
		records: [],
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
		async apply({ context, input, output, reporter }) {
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

			const manifest = createEmptyManifest();

			for (const instruction of plan.instructions) {
				await processInstruction({
					workspace: context.workspace,
					instruction,
					manifest,
					output,
					reporter,
				});
			}

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
}: ProcessInstructionOptions): Promise<void> {
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
