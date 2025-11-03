import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type {
	KernelConfigV1Like,
	LoadedKernelConfigLike,
} from '../../types.js';

export const TMP_PREFIX = path.join(os.tmpdir(), 'cli-apply-command-');

export type ApplyLogStatus =
	| 'success'
	| 'conflict'
	| 'skipped'
	| 'cancelled'
	| 'failed';

export interface ApplyLogFlags {
	readonly yes: boolean;
	readonly backup: boolean;
	readonly force: boolean;
}

export interface ApplyLogSummary {
	readonly applied: number;
	readonly conflicts: number;
	readonly skipped: number;
}

export interface ApplyLogRecord {
	readonly file: string;
	readonly status: 'applied' | 'conflict' | 'skipped';
	readonly description?: string;
	readonly details?: Record<string, unknown>;
}

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

export interface BuildLoadedConfigOptions<
	TConfig extends KernelConfigV1Like = KernelConfigV1Like,
	TOrigin extends string = string,
	TComposerCheck extends string = string,
> {
	readonly config?: TConfig;
	readonly namespace?: string;
	readonly sourcePath?: string;
	readonly configOrigin?: TOrigin;
	readonly composerCheck?: TComposerCheck;
}

export function buildLoadedConfig<
	TConfig extends KernelConfigV1Like = KernelConfigV1Like,
	TOrigin extends string = string,
	TComposerCheck extends string = string,
>(
	workspace: string,
	options: BuildLoadedConfigOptions<TConfig, TOrigin, TComposerCheck> = {}
): LoadedKernelConfigLike<TConfig, TOrigin, TComposerCheck> {
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
	} satisfies LoadedKernelConfigLike<TConfig, TOrigin, TComposerCheck>;
}

export async function ensureDirectory(directory: string): Promise<void> {
	await fs.mkdir(directory, { recursive: true });
}

export function toFsPath(workspace: string, posixPath: string): string {
	const segments = posixPath.split('/').filter(Boolean);
	return path.join(workspace, ...segments);
}

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
