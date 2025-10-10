import path from 'node:path';
import fs from 'node:fs/promises';
import { Command } from 'clipanion';
import { createReporter, KernelError } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter } from '@geekist/wp-kernel';
import { toWorkspaceRelative } from '../utils';

const AUTO_BLOCK_PATTERN = /\/\/ WPK:BEGIN AUTO[\s\S]*?\/\/ WPK:END AUTO/;

interface ApplySummary {
	counts: {
		created: number;
		updated: number;
		skipped: number;
	};
	targetRoot: string;
}

type ApplyStatus = keyof ApplySummary['counts'];

export class ApplyCommand extends Command {
	static override paths = [['apply']];

	static override usage = Command.Usage({
		description:
			'Apply generated PHP artifacts into the plugin inc/ directory.',
		examples: [['Apply generated PHP files to inc/', 'wpk apply']],
	});

	public summary?: ApplySummary;

	override async execute(): Promise<0 | 1> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.apply`,
			level: 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		try {
			const workspace = process.cwd();
			const generatedRoot = path.resolve(workspace, '.generated/php');
			const targetRoot = path.resolve(workspace, 'inc');

			await ensureDirectoryExists(generatedRoot);

			const summary = await this.applyGeneratedPhp({
				generatedRoot,
				targetRoot,
				reporter,
			});

			this.summary = summary;

			reporter.info('Apply completed.', {
				counts: summary.counts,
				targetRoot: toWorkspaceRelative(summary.targetRoot),
			});

			this.context.stdout.write(this.renderSummary(summary));
			return 0;
		} catch (error) {
			this.summary = undefined;
			return this.handleFailure(reporter, error);
		}
	}

	private async applyGeneratedPhp(options: {
		generatedRoot: string;
		targetRoot: string;
		reporter: Reporter;
	}): Promise<ApplySummary> {
		const { generatedRoot, targetRoot, reporter } = options;
		const generatedFiles = await collectGeneratedFiles(generatedRoot);

		const counts: ApplySummary['counts'] = {
			created: 0,
			updated: 0,
			skipped: 0,
		};

		for (const sourcePath of generatedFiles) {
			const relativePath = path.relative(generatedRoot, sourcePath);
			const destinationPath = path.join(targetRoot, relativePath);
			const status = await this.applyFile({
				sourcePath,
				destinationPath,
			});

			counts[status] += 1;

			reporter.debug('Applied generated file.', {
				status,
				source: toWorkspaceRelative(sourcePath),
				destination: toWorkspaceRelative(destinationPath),
			});
		}

		return {
			counts,
			targetRoot,
		};
	}

	private async applyFile(options: {
		sourcePath: string;
		destinationPath: string;
	}): Promise<ApplyStatus> {
		const { sourcePath, destinationPath } = options;
		const generatedContents = await fs.readFile(sourcePath, 'utf8');

		try {
			const existingContents = await fs.readFile(destinationPath, 'utf8');
			const merged = mergeGeneratedContents({
				existingContents,
				generatedContents,
				destinationPath,
				sourcePath,
			});

			if (merged === existingContents) {
				return 'skipped';
			}

			await fs.mkdir(path.dirname(destinationPath), { recursive: true });
			await fs.writeFile(destinationPath, merged, 'utf8');
			return 'updated';
		} catch (error) {
			if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
				throw error;
			}

			await fs.mkdir(path.dirname(destinationPath), { recursive: true });
			await fs.writeFile(destinationPath, generatedContents, 'utf8');
			return 'created';
		}
	}

	private handleFailure(reporter: Reporter, error: unknown): 1 {
		const serialised = this.serialiseError(error);
		reporter.error('Apply failed.', serialised);

		const message = this.formatErrorMessage(error);

		this.context.stderr.write(`Apply failed: ${message}\n`);
		return 1;
	}

	private serialiseError(error: unknown): Record<string, unknown> {
		if (KernelError.isKernelError(error)) {
			return {
				code: error.code,
				message: error.message,
				context: error.context,
				data: error.data,
			};
		}

		if (error instanceof Error) {
			return {
				message: error.message,
				stack: error.stack,
			};
		}

		return { message: String(error) };
	}

	private formatErrorMessage(error: unknown): string {
		if (KernelError.isKernelError(error)) {
			return error.message;
		}

		if (error instanceof Error) {
			return error.message;
		}

		return String(error);
	}

	private renderSummary(summary: ApplySummary): string {
		const lines = [
			'Apply summary:',
			`  Target: ${toWorkspaceRelative(summary.targetRoot)}`,
			`  Created: ${summary.counts.created}`,
			`  Updated: ${summary.counts.updated}`,
			`  Skipped: ${summary.counts.skipped}`,
		];

		return `${lines.join('\n')}\n`;
	}
}

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
	try {
		const stat = await fs.stat(directoryPath);
		if (!stat.isDirectory()) {
			throw new KernelError('DeveloperError', {
				message: 'Expected generated PHP directory to exist.',
				context: {
					path: toWorkspaceRelative(directoryPath),
				},
			});
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			throw new KernelError('DeveloperError', {
				message:
					'Generated PHP artifacts not found. Run "wpk generate" before applying.',
				context: {
					path: toWorkspaceRelative(directoryPath),
				},
			});
		}

		throw error;
	}
}

async function collectGeneratedFiles(root: string): Promise<string[]> {
	const entries = await fs.readdir(root, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const entryPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			const nested = await collectGeneratedFiles(entryPath);
			files.push(...nested);
		} else if (entry.isFile()) {
			files.push(entryPath);
		}
	}

	files.sort((a, b) => a.localeCompare(b));
	return files;
}

function mergeGeneratedContents(options: {
	existingContents: string;
	generatedContents: string;
	destinationPath: string;
	sourcePath: string;
}): string {
	const { existingContents, generatedContents, destinationPath, sourcePath } =
		options;

	const generatedHasMarkers = AUTO_BLOCK_PATTERN.test(generatedContents);
	const existingHasMarkers = AUTO_BLOCK_PATTERN.test(existingContents);

	if (generatedHasMarkers && existingHasMarkers) {
		return mergeAutoSections(existingContents, generatedContents);
	}

	if (!generatedHasMarkers && !existingHasMarkers) {
		return generatedContents === existingContents
			? existingContents
			: generatedContents;
	}

	if (generatedHasMarkers) {
		throw new KernelError('DeveloperError', {
			message:
				'Cannot apply generated file because the destination is missing WPK auto markers.',
			context: {
				destinationPath: toWorkspaceRelative(destinationPath),
				sourcePath: toWorkspaceRelative(sourcePath),
			},
		});
	}

	throw new KernelError('DeveloperError', {
		message: 'Generated artifact is missing WPK auto markers.',
		context: {
			sourcePath: toWorkspaceRelative(sourcePath),
			destinationPath: toWorkspaceRelative(destinationPath),
		},
	});
}

function mergeAutoSections(
	existingContents: string,
	generatedContents: string
): string {
	const generatedMatch = generatedContents.match(AUTO_BLOCK_PATTERN);
	const existingMatch = existingContents.match(AUTO_BLOCK_PATTERN);

	if (!generatedMatch || !existingMatch) {
		return existingContents;
	}

	const generatedBlock = generatedMatch[0]!;
	const existingBlock = existingMatch[0]!;

	if (generatedBlock === existingBlock) {
		return existingContents;
	}

	return existingContents.replace(AUTO_BLOCK_PATTERN, generatedBlock);
}

export const __testUtils = {
	mergeAutoSections,
};
