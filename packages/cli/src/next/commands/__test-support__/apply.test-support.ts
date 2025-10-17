import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedKernelConfig } from '../../../config/types';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';

export const TMP_PREFIX = path.join(os.tmpdir(), 'next-apply-command-');

export function createLoadedConfig(workspace: string): LoadedKernelConfig {
	return {
		config: {
			version: 1,
			namespace: 'Demo',
			schemas: {},
			resources: {},
		},
		namespace: 'Demo',
		sourcePath: path.join(workspace, WPK_CONFIG_SOURCES.WPK_CONFIG_TS),
		configOrigin: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		composerCheck: 'ok',
	} satisfies LoadedKernelConfig;
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
