import path from 'node:path';
import fs from 'node:fs/promises';
import { Command } from 'clipanion';
import { createReporter } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter } from '@geekist/wp-kernel';
import { resolveFromWorkspace, toWorkspaceRelative } from '../utils';

const BEGIN_MARKER = 'WPK:BEGIN AUTO';
const END_MARKER = 'WPK:END AUTO';

export interface ApplySummary {
	created: number;
	updated: number;
	skipped: number;
}

interface ApplyOptions {
	reporter: Reporter;
	sourceDir: string;
	targetDir: string;
}

export class ApplyCommand extends Command {
	static override paths = [['apply']];

	static override usage = Command.Usage({
		description:
			'Apply generated PHP artifacts into the working inc/ directory.',
		examples: [['Apply generated controllers into inc/', 'wpk apply']],
	});

	public summary: ApplySummary | null = null;

	override async execute(): Promise<number> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.apply`,
			level: 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		const sourceDir = resolveFromWorkspace('.generated/php');
		const targetDir = resolveFromWorkspace('inc');

		reporter.info('Applying generated PHP artifacts.', {
			sourceDir: toWorkspaceRelative(sourceDir),
			targetDir: toWorkspaceRelative(targetDir),
		});

		try {
			const summary = await applyGeneratedPhpArtifacts({
				reporter,
				sourceDir,
				targetDir,
			});
			this.summary = summary;
		} catch (error) {
			reporter.error('Failed to apply generated PHP artifacts.', {
				error:
					error instanceof Error
						? { name: error.name, message: error.message }
						: { value: error },
			});
			return 1;
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
}: ApplyOptions): Promise<ApplySummary> {
	await fs.mkdir(targetDir, { recursive: true });

	const files = await collectPhpFiles(sourceDir);

	if (files.length === 0) {
		reporter.info('No generated PHP files found to apply.', {
			sourceDir: toWorkspaceRelative(sourceDir),
		});
		return { created: 0, updated: 0, skipped: 0 };
	}

	const summary: ApplySummary = { created: 0, updated: 0, skipped: 0 };

	for (const file of files) {
		const relative = path.relative(sourceDir, file);
		const destination = path.join(targetDir, relative);
		const destinationDir = path.dirname(destination);
		await fs.mkdir(destinationDir, { recursive: true });

		const generated = await fs.readFile(file, 'utf8');
		const existing = await readFileIfExists(destination);

		let status: keyof ApplySummary;

		if (existing === null) {
			await fs.writeFile(destination, generated, 'utf8');
			status = 'created';
		} else if (hasGuardMarkers(generated)) {
			if (!hasGuardMarkers(existing)) {
				throw new Error(
					`Destination missing guard markers: ${toWorkspaceRelative(
						destination
					)}`
				);
			}

			const nextContents = mergeGuardedContent(existing, generated);

			if (nextContents === existing) {
				status = 'skipped';
			} else {
				await fs.writeFile(destination, nextContents, 'utf8');
				status = 'updated';
			}
		} else if (existing === generated) {
			status = 'skipped';
		} else {
			await fs.writeFile(destination, generated, 'utf8');
			status = 'updated';
		}

		summary[status] += 1;

		reporter.debug('Processed PHP artifact.', {
			source: toWorkspaceRelative(file),
			target: toWorkspaceRelative(destination),
			status,
		});
	}

	return summary;
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

function readFileIfExists(filePath: string): Promise<string | null> {
	return fs
		.readFile(filePath, 'utf8')
		.then((contents) => contents)
		.catch((error: unknown) => {
			if (isNotFoundError(error)) {
				return null;
			}

			throw error;
		});
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
