import path from 'node:path';
import fs from 'node:fs/promises';
import { KernelError } from '@wpkernel/core/error';
import { toWorkspaceRelative } from '../../utils';
import type {
	ApplyOptions,
	ApplyResult,
	ApplyFileRecord,
	ApplySummary,
} from './types';
import { BEGIN_MARKER, END_MARKER } from './constants';
import { serialiseError } from './errors';
import { isNotFoundError, statIfExists } from './fs-utils';

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

interface GuardedFileParams {
	destination: string;
	generated: string;
	existing: string;
	backup: boolean;
	force: boolean;
	source: string;
}

interface OverwriteFileParams {
	destination: string;
	nextContents: string;
	backup: boolean;
	existing: string;
	forced?: boolean;
}

interface GuardSegment {
	start: number;
	end: number;
	segment: string;
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
