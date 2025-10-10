import path from 'node:path';
import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { Command, Option } from 'clipanion';
import { createReporter, KernelError } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter, SerializedError } from '@geekist/wp-kernel';
import { resolveFromWorkspace, toWorkspaceRelative } from '../utils';

const BEGIN_MARKER = 'WPK:BEGIN AUTO';
const END_MARKER = 'WPK:END AUTO';

const execFile = promisify(execFileCallback);

export interface ApplySummary {
	created: number;
	updated: number;
	skipped: number;
}

interface ApplyOptions {
	reporter: Reporter;
	sourceDir: string;
	targetDir: string;
	force: boolean;
	backup: boolean;
}

export interface ApplyFileRecord {
	source: string;
	target: string;
	status: keyof ApplySummary;
	backup?: string | null;
	forced?: boolean;
}

export interface ApplyResult {
	summary: ApplySummary;
	records: ApplyFileRecord[];
}

export class ApplyCommand extends Command {
	static override paths = [['apply']];

	static override usage = Command.Usage({
		description:
			'Apply generated PHP artifacts into the working inc/ directory.',
		examples: [['Apply generated controllers into inc/', 'wpk apply']],
	});

	yes = Option.Boolean('--yes', false);
	backup = Option.Boolean('--backup', false);
	force = Option.Boolean('--force', false);

	public summary: ApplySummary | null = null;

	override async execute(): Promise<number> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.apply`,
			level: 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		const sourceDir = resolveFromWorkspace('.generated/php');
		const targetDir = resolveFromWorkspace('inc');
		const logPath = resolveFromWorkspace('.wpk-apply.log');
		const yes = this.yes === true;
		const backup = this.backup === true;
		const force = this.force === true;
		const flags = {
			yes,
			backup,
			force,
		};
		const timestamp = new Date().toISOString();

		reporter.info('Applying generated PHP artifacts.', {
			sourceDir: toWorkspaceRelative(sourceDir),
			targetDir: toWorkspaceRelative(targetDir),
			flags,
		});

		try {
			await ensureGeneratedPhpClean({
				reporter,
				sourceDir,
				yes,
			});

			const result = await applyGeneratedPhpArtifacts({
				reporter,
				sourceDir,
				targetDir,
				backup,
				force,
			});
			this.summary = result.summary;
			reporter.info('Apply completed.', {
				summary: result.summary,
				flags,
			});
			await appendApplyLog(
				logPath,
				{
					timestamp,
					flags,
					result: 'success',
					summary: result.summary,
					files: result.records,
				},
				reporter
			);
		} catch (error) {
			const exitCode = determineExitCode(error);
			reportFailure(
				reporter,
				'Failed to apply generated PHP artifacts.',
				error
			);
			await appendApplyLog(
				logPath,
				{
					timestamp,
					flags,
					result: 'failure',
					error: serialiseError(error),
				},
				reporter
			);
			return exitCode;
		}

		const summary = this.summary!;
		const { created, updated, skipped } = summary;

		this.context.stdout.write(
			`PHP apply summary: created ${created}, updated ${updated}, skipped ${skipped}\n`
		);

		return 0;
	}
}

export async function applyGeneratedPhpArtifacts({
	reporter,
	sourceDir,
	targetDir,
	force,
	backup,
}: ApplyOptions): Promise<ApplyResult> {
	try {
		await fs.mkdir(targetDir, { recursive: true });

		const files = await collectPhpFiles(sourceDir);

		if (files.length === 0) {
			reporter.info('No generated PHP files found to apply.', {
				sourceDir: toWorkspaceRelative(sourceDir),
			});
			return {
				summary: { created: 0, updated: 0, skipped: 0 },
				records: [],
			};
		}

		const summary: ApplySummary = { created: 0, updated: 0, skipped: 0 };
		const records: ApplyFileRecord[] = [];

		for (const file of files) {
			const relative = path.relative(sourceDir, file);
			const destination = path.join(targetDir, relative);
			const destinationDir = path.dirname(destination);
			await fs.mkdir(destinationDir, { recursive: true });

			const generated = await fs.readFile(file, 'utf8');
			const existingStat = await statIfExists(destination);

			if (existingStat?.isDirectory()) {
				throw new KernelError('ValidationError', {
					message:
						'Cannot overwrite directory with generated PHP artifact.',
					context: {
						target: toWorkspaceRelative(destination),
					},
				});
			}

			const existing = existingStat
				? await fs.readFile(destination, 'utf8')
				: null;

			const outcome = await applyFile({
				destination,
				generated,
				existing,
				backup,
				force,
				source: file,
			});

			summary[outcome.status] += 1;

			const record: ApplyFileRecord = {
				source: toWorkspaceRelative(file),
				target: toWorkspaceRelative(destination),
				status: outcome.status,
			};

			if (outcome.backupPath) {
				record.backup = toWorkspaceRelative(outcome.backupPath);
			}

			if (outcome.forced) {
				record.forced = true;
			}

			records.push(record);

			reporter.debug('Processed PHP artifact.', {
				source: record.source,
				target: record.target,
				status: outcome.status,
				backup: record.backup,
				forced: Boolean(outcome.forced),
			});
		}

		return { summary, records };
	} catch (error) {
		if (KernelError.isKernelError(error)) {
			throw error;
		}

		/* istanbul ignore next - unexpected I/O failure */
		throw new KernelError('DeveloperError', {
			message: 'Unexpected error while applying generated PHP artifacts.',
			context: {
				error: serialiseError(error),
			},
		});
	}
}

async function collectPhpFiles(root: string): Promise<string[]> {
	try {
		const stat = await fs.stat(root);
		if (!stat.isDirectory()) {
			return [];
		}
	} catch (error) {
		if (isNotFoundError(error)) {
			return [];
		}

		/* istanbul ignore next - surface unexpected FS errors */
		throw error;
	}

	const stack: string[] = [root];
	const files: string[] = [];

	while (stack.length > 0) {
		const current = stack.pop()!;
		const entries = await fs.readdir(current, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(entryPath);
			} else if (entry.isFile() && entry.name.endsWith('.php')) {
				files.push(entryPath);
			}
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
}

function hasGuardMarkers(contents: string): boolean {
	return contents.includes(BEGIN_MARKER) && contents.includes(END_MARKER);
}

interface GuardSegment {
	start: number;
	end: number;
	segment: string;
}

function mergeGuardedContent(existing: string, generated: string): string {
	const existingSegment = locateGuardSegment(existing);
	const generatedSegment = locateGuardSegment(generated);

	if (existingSegment.segment === generatedSegment.segment) {
		return existing;
	}

	return (
		existing.slice(0, existingSegment.start) +
		generatedSegment.segment +
		existing.slice(existingSegment.end)
	);
}

function locateGuardSegment(contents: string): GuardSegment {
	const beginIndex = contents.indexOf(BEGIN_MARKER);
	const endIndex = contents.indexOf(END_MARKER, beginIndex);

	if (beginIndex === -1 || endIndex === -1) {
		/* istanbul ignore next - guard markers validated before merge */
		throw new Error('Guard markers not found in PHP file.');
	}

	const start = Math.max(contents.lastIndexOf('\n', beginIndex - 1) + 1, 0);
	const endOfLine = contents.indexOf('\n', endIndex);
	const end = endOfLine === -1 ? contents.length : endOfLine + 1;
	const segment = contents.slice(start, end);

	return { start, end, segment };
}

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === 'ENOENT'
	);
}

async function ensureGeneratedPhpClean({
	reporter,
	sourceDir,
	yes,
}: {
	reporter: Reporter;
	sourceDir: string;
	yes: boolean;
}): Promise<void> {
	if (yes) {
		reporter.warn(
			'Skipping generated PHP cleanliness check (--yes provided).'
		);
		return;
	}

	const stat = await statIfExists(sourceDir);
	if (!stat || !stat.isDirectory()) {
		return;
	}

	const relativeSource = toWorkspaceRelative(sourceDir);

	try {
		const { stdout } = await execFile('git', [
			'status',
			'--porcelain',
			'--',
			relativeSource,
		]);

		if (stdout.trim().length > 0) {
			throw new KernelError('ValidationError', {
				message: 'Generated PHP directory has uncommitted changes.',
				context: {
					path: relativeSource,
					statusOutput: stdout.trim().split('\n'),
				},
			});
		}
	} catch (error) {
		if (isGitRepositoryMissing(error)) {
			reporter.debug(
				'Skipping generated PHP cleanliness check (not a git repository).'
			);
			return;
		}

		if (KernelError.isKernelError(error)) {
			throw error;
		}

		/* istanbul ignore next - git invocation failed unexpectedly */
		throw new KernelError('DeveloperError', {
			message: 'Unable to verify generated PHP cleanliness.',
			context: {
				path: relativeSource,
				error: serialiseError(error),
			},
		});
	}
}

function isGitRepositoryMissing(error: unknown): boolean {
	/* istanbul ignore next - fallback for string-shaped git errors */
	if (typeof error === 'string') {
		return error.includes('not a git repository');
	}

	if (typeof error === 'object' && error !== null) {
		const message =
			typeof (error as { message?: unknown }).message === 'string'
				? ((error as { message?: string }).message as string)
				: '';
		const stderr =
			typeof (error as { stderr?: unknown }).stderr === 'string'
				? ((error as { stderr?: string }).stderr as string)
				: '';

		if (message.includes('not a git repository')) {
			return true;
		}

		if (stderr.includes('not a git repository')) {
			return true;
		}
	}

	return false;
}

async function appendApplyLog(
	logPath: string,
	entry: ApplyLogEntry,
	reporter: Reporter
): Promise<void> {
	const line = `${JSON.stringify(entry)}\n`;

	try {
		await fs.appendFile(logPath, line, 'utf8');
	} catch (error) {
		/* istanbul ignore next - log write is best-effort */
		reporter.warn('Failed to append apply log.', {
			logPath: toWorkspaceRelative(logPath),
			error: serialiseError(error),
		});
	}
}

async function statIfExists(filePath: string): Promise<Stats | null> {
	try {
		return await fs.stat(filePath);
	} catch (error) {
		if (isNotFoundError(error)) {
			return null;
		}

		/* istanbul ignore next - propagate unexpected FS errors */
		throw error;
	}
}

function determineExitCode(error: unknown): number {
	if (KernelError.isKernelError(error)) {
		if (error.code === 'ValidationError') {
			return 1;
		}

		/* istanbul ignore next - default exit path */
		return 2;
	}

	return 2;
}

function reportFailure(
	reporter: Reporter,
	message: string,
	error: unknown
): void {
	reporter.error(message, serialiseError(error));
}

function serialiseError(
	error: unknown
): SerializedError | Record<string, unknown> {
	if (KernelError.isKernelError(error)) {
		return error.toJSON();
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	/* istanbul ignore next - serialise arbitrary error shapes */
	return { value: error };
}

interface ApplyLogEntry {
	timestamp: string;
	flags: {
		yes: boolean;
		backup: boolean;
		force: boolean;
	};
	result: 'success' | 'failure';
	summary?: ApplySummary;
	files?: ApplyFileRecord[];
	error?: SerializedError | Record<string, unknown>;
}

interface ApplyFileOutcome {
	status: keyof ApplySummary;
	backupPath?: string;
	forced?: boolean;
}

interface ApplyFileParams {
	destination: string;
	generated: string;
	existing: string | null;
	backup: boolean;
	force: boolean;
	source: string;
}

async function applyFile({
	destination,
	generated,
	existing,
	backup,
	force,
	source,
}: ApplyFileParams): Promise<ApplyFileOutcome> {
	if (existing === null) {
		await fs.writeFile(destination, generated, 'utf8');
		return { status: 'created' };
	}

	if (hasGuardMarkers(generated)) {
		return applyGuardedFile({
			destination,
			generated,
			existing,
			backup,
			force,
			source,
		});
	}

	if (existing === generated) {
		return { status: 'skipped' };
	}

	return overwriteFile({
		destination,
		nextContents: generated,
		backup,
		existing,
	});
}

interface GuardedFileParams {
	destination: string;
	generated: string;
	existing: string;
	backup: boolean;
	force: boolean;
	source: string;
}

async function applyGuardedFile({
	destination,
	generated,
	existing,
	backup,
	force,
	source,
}: GuardedFileParams): Promise<ApplyFileOutcome> {
	if (!hasGuardMarkers(existing)) {
		if (!force) {
			throw new KernelError('ValidationError', {
				message: 'Guard markers missing from destination file.',
				context: {
					source: toWorkspaceRelative(source),
					target: toWorkspaceRelative(destination),
				},
			});
		}

		return overwriteFile({
			destination,
			nextContents: generated,
			backup,
			existing,
			forced: true,
		});
	}

	const nextContents = mergeGuardedContent(existing, generated);

	if (nextContents === existing) {
		return { status: 'skipped' };
	}

	return overwriteFile({
		destination,
		nextContents,
		backup,
		existing,
	});
}

interface OverwriteFileParams {
	destination: string;
	nextContents: string;
	backup: boolean;
	existing: string;
	forced?: boolean;
}

async function overwriteFile({
	destination,
	nextContents,
	backup,
	existing,
	forced = false,
}: OverwriteFileParams): Promise<ApplyFileOutcome> {
	let backupPath: string | undefined;

	if (backup) {
		backupPath = `${destination}.bak`;
		await fs.writeFile(backupPath, existing, 'utf8');
	}

	await fs.writeFile(destination, nextContents, 'utf8');

	return {
		status: 'updated',
		backupPath,
		forced: forced ? true : undefined,
	};
}
