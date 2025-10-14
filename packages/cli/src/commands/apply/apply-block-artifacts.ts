import path from 'node:path';
import fs from 'node:fs/promises';
import { KernelError } from '@geekist/wp-kernel/error';
import { toWorkspaceRelative } from '../../utils';
import type {
	ApplyOptions,
	ApplyResult,
	ApplySummary,
	ApplyFileRecord,
} from './types';
import { isNotFoundError, statIfExists } from './fs-utils';
import { serialiseError } from './errors';
import { applyGeneratedPhpArtifacts } from './apply-generated-php-artifacts';

interface ApplyFileOutcome {
	status: keyof ApplySummary;
	backupPath?: string;
}

export async function applyGeneratedBlockArtifacts({
	reporter,
	sourceDir,
	targetDir,
	backup,
	force,
}: ApplyOptions): Promise<ApplyResult> {
	try {
		await fs.mkdir(targetDir, { recursive: true });

		const files = await collectGeneratedFiles(sourceDir);

		if (files.length === 0) {
			reporter.info('No generated block artifacts found to apply.', {
				sourceDir: toWorkspaceRelative(sourceDir),
			});
			return {
				summary: { created: 0, updated: 0, skipped: 0 },
				records: [],
			};
		}

		const nonPhpFiles = files.filter((file) => !file.endsWith('.php'));
		const summary: ApplySummary = { created: 0, updated: 0, skipped: 0 };
		const records: ApplyFileRecord[] = [];

		if (nonPhpFiles.length !== files.length) {
			const phpResult = await applyGeneratedPhpArtifacts({
				reporter,
				sourceDir,
				targetDir,
				backup,
				force,
			});

			summary.created += phpResult.summary.created;
			summary.updated += phpResult.summary.updated;
			summary.skipped += phpResult.summary.skipped;
			records.push(...phpResult.records);
		}

		for (const file of nonPhpFiles) {
			const relative = path.relative(sourceDir, file);
			const destination = path.join(targetDir, relative);
			const destinationDir = path.dirname(destination);
			await fs.mkdir(destinationDir, { recursive: true });

			const generated = await fs.readFile(file);
			const existingStat = await statIfExists(destination);

			if (existingStat?.isDirectory()) {
				throw new KernelError('ValidationError', {
					message:
						'Cannot overwrite directory with generated block artifact.',
					context: {
						source: toWorkspaceRelative(file),
						target: toWorkspaceRelative(destination),
					},
				});
			}

			const existing = existingStat
				? await fs.readFile(destination)
				: null;

			const outcome = await applyBinaryFile({
				destination,
				generated,
				existing,
				backup,
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

			records.push(record);

			reporter.debug('Processed block artifact.', {
				source: record.source,
				target: record.target,
				status: outcome.status,
				backup: record.backup,
			});
		}

		return { summary, records };
	} catch (error) {
		if (KernelError.isKernelError(error)) {
			throw error;
		}

		/* istanbul ignore next - unexpected I/O failure */
		throw new KernelError('DeveloperError', {
			message:
				'Unexpected error while applying generated block artifacts.',
			context: {
				error: serialiseError(error),
			},
		});
	}
}

async function collectGeneratedFiles(root: string): Promise<string[]> {
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
			} else if (entry.isFile()) {
				files.push(entryPath);
			}
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
}

async function applyBinaryFile({
	destination,
	generated,
	existing,
	backup,
}: {
	destination: string;
	generated: Buffer;
	existing: Buffer | null;
	backup: boolean;
}): Promise<ApplyFileOutcome> {
	if (existing === null) {
		await fs.writeFile(destination, generated);
		return { status: 'created' };
	}

	if (existing.equals(generated)) {
		return { status: 'skipped' };
	}

	let backupPath: string | undefined;

	if (backup) {
		backupPath = `${destination}.bak`;
		await fs.writeFile(backupPath, existing);
	}

	await fs.writeFile(destination, generated);

	return { status: 'updated', backupPath };
}
