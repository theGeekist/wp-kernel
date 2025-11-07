import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { WPKConfigV1Like, LoadedWPKConfigV1Like } from '../../types.js';

/**
 * Prefix for temporary directories created for CLI apply command tests.
 *
 * @category CLI Helpers
 */
export const TMP_PREFIX = path.join(os.tmpdir(), 'cli-apply-command-');

/**
 * Represents the status of an apply operation in the log.
 *
 * @category CLI Helpers
 */
export type ApplyLogStatus =
	| 'success'
	| 'conflict'
	| 'skipped'
	| 'cancelled'
	| 'failed';

/**
 * Represents the flags used during an apply operation.
 *
 * @category CLI Helpers
 */
export interface ApplyLogFlags {
	readonly yes: boolean;
	readonly backup: boolean;
	readonly force: boolean;
}

/**
 * Summary of an apply operation.
 *
 * @category CLI Helpers
 */
export interface ApplyLogSummary {
	readonly applied: number;
	readonly conflicts: number;
	readonly skipped: number;
}

/**
 * Represents a single record within an apply log entry.
 *
 * @category CLI Helpers
 */
export interface ApplyLogRecord {
	readonly file: string;
	readonly status: 'applied' | 'conflict' | 'skipped';
	readonly description?: string;
	readonly details?: Record<string, unknown>;
}

/**
 * Represents a complete entry in the apply log.
 *
 * @category CLI Helpers
 */
export interface ApplyLogEntry {
	readonly version: number;
	readonly timestamp: string;
	readonly status: ApplyLogStatus;
	readonly exitCode: number;
	readonly flags: ApplyLogFlags;
	readonly summary: ApplyLogSummary | null;
	readonly records: readonly ApplyLogRecord[];
	readonly actions: readonly string[];
	readonly error?: unknown;
}

/**
 * Options for building a loaded wpk configuration.
 *
 * @category CLI Helpers
 */
export interface BuildLoadedConfigOptions<
	TConfig extends WPKConfigV1Like = WPKConfigV1Like,
	TOrigin extends string = string,
	TComposerCheck extends string = string,
> {
	/** The wpk configuration object. */
	readonly config?: TConfig;
	/** The namespace of the project. */
	readonly namespace?: string;
	/** The source path of the configuration file. */
	readonly sourcePath?: string;
	/** The origin of the configuration (e.g., 'project', 'workspace'). */
	readonly configOrigin?: TOrigin;
	/** The composer check status. */
	readonly composerCheck?: TComposerCheck;
}

/**
 * Builds a loaded wpk configuration object for testing.
 *
 * @category CLI Helpers
 * @param    workspace - The path to the workspace.
 * @param    options   - Options for configuring the loaded config.
 * @returns A `LoadedWPKConfigV1Like` object.
 */
export function buildLoadedConfig<
	TConfig extends WPKConfigV1Like = WPKConfigV1Like,
	TOrigin extends string = string,
	TComposerCheck extends string = string,
>(
	workspace: string,
	options: BuildLoadedConfigOptions<TConfig, TOrigin, TComposerCheck> = {}
): LoadedWPKConfigV1Like<TConfig, TOrigin, TComposerCheck> {
	const defaultConfig = {
		version: 1,
		namespace: 'Demo',
		schemas: {},
		resources: {},
	} as TConfig;

	const config = options.config ?? defaultConfig;
	const namespace = options.namespace ?? config.namespace;

	const configOrigin = (options.configOrigin ??
		WPK_CONFIG_SOURCES.WPK_CONFIG_TS) as TOrigin;

	return {
		config,
		namespace,
		sourcePath:
			options.sourcePath ??
			path.join(workspace, WPK_CONFIG_SOURCES.WPK_CONFIG_TS),
		configOrigin,
		composerCheck: options.composerCheck ?? ('ok' as TComposerCheck),
	} satisfies LoadedWPKConfigV1Like<TConfig, TOrigin, TComposerCheck>;
}

/**
 * Ensures that a directory exists, creating it if necessary.
 *
 * @category CLI Helpers
 * @param    directory - The path to the directory.
 * @returns A Promise that resolves when the directory is ensured.
 */
export async function ensureDirectory(directory: string): Promise<void> {
	await fs.mkdir(directory, { recursive: true });
}

/**
 * Converts a POSIX-style path to a file system path relative to a workspace.
 *
 * @category CLI Helpers
 * @param    workspace - The path to the workspace.
 * @param    posixPath - The POSIX-style path to convert.
 * @returns The file system path.
 */
export function toFsPath(workspace: string, posixPath: string): string {
	const segments = posixPath.split('/').filter(Boolean);
	return path.join(workspace, ...segments);
}

/**
 * Seeds an apply plan in a given workspace.
 *
 * @category CLI Helpers
 * @param    workspace           - The path to the workspace.
 * @param    file                - The file name for the plan.
 * @param    options.base
 * @param    options.incoming
 * @param    options.description
 * @param    options.current
 * @param    options             - Options for seeding the plan (base content, incoming content, description, current content).
 * @returns A Promise that resolves when the plan is seeded.
 */
export async function seedPlan(
	workspace: string,
	file: string,
	options: {
		base: string;
		incoming?: string | null;
		description?: string;
		current?: string;
	}
): Promise<void> {
	const planPath = path.join(workspace, '.wpk', 'apply', 'plan.json');
	await ensureDirectory(path.dirname(planPath));

	const instruction = {
		file,
		base: path.posix.join('.wpk', 'apply', 'base', file),
		incoming: path.posix.join('.wpk', 'apply', 'incoming', file),
		description: options.description,
	};

	await fs.writeFile(
		planPath,
		JSON.stringify({ instructions: [instruction] }, null, 2),
		'utf8'
	);

	const basePath = toFsPath(workspace, instruction.base);
	const incomingPath = toFsPath(workspace, instruction.incoming);
	const targetPath = toFsPath(workspace, instruction.file);

	await ensureDirectory(path.dirname(basePath));
	await ensureDirectory(path.dirname(incomingPath));
	await ensureDirectory(path.dirname(targetPath));

	await fs.writeFile(basePath, options.base, 'utf8');
	if (typeof options.incoming === 'string') {
		await fs.writeFile(incomingPath, options.incoming, 'utf8');
	}

	if (typeof options.current === 'string') {
		await fs.writeFile(targetPath, options.current, 'utf8');
	}
}

/**
 * Reads apply log entries from a workspace.
 *
 * @category CLI Helpers
 * @param    workspace - The path to the workspace.
 * @returns A Promise that resolves to an array of `ApplyLogEntry` objects.
 */
export async function readApplyLogEntries(
	workspace: string
): Promise<ApplyLogEntry[]> {
	const logPath = path.join(workspace, '.wpk-apply.log');
	const raw = await fs.readFile(logPath, 'utf8').catch(() => '');
	const trimmed = raw.trim();

	if (trimmed.length === 0) {
		return [];
	}

	return trimmed.split('\n').map((line) => JSON.parse(line) as ApplyLogEntry);
}
