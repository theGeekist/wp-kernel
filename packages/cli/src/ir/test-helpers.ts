import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { KernelConfigV1 } from '../config/types';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';

export const FIXTURE_ROOT = path.join(__dirname, '__fixtures__');
export const FIXTURE_CONFIG_PATH = path.join(
	FIXTURE_ROOT,
	WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS
);
const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-ir-test-');

export function createBaseConfig(): KernelConfigV1 {
	return {
		version: 1,
		namespace: 'test-namespace',
		schemas: {},
		resources: {},
	} as unknown as KernelConfigV1;
}

export async function withTempSchema(
	contents: string,
	run: (schemaPath: string) => Promise<void>
): Promise<void> {
	const tempDir = await fs.mkdtemp(TMP_PREFIX);
	const schemaPath = path.join(tempDir, 'temp.schema.json');
	await fs.writeFile(schemaPath, contents, 'utf8');

	try {
		await run(schemaPath);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

export function canonicalHash(value: unknown): string {
	return createHash('sha256')
		.update(
			JSON.stringify(sortValue(value), null, 2).replace(/\r\n/g, '\n'),
			'utf8'
		)
		.digest('hex');
}

export function sortValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sortValue(entry)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, val]) => [key, sortValue(val)] as const)
			.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

		return Object.fromEntries(entries) as T;
	}

	if (typeof value === 'undefined') {
		return null as unknown as T;
	}

	return value;
}

export async function withTempWorkspace(
	populate: (root: string) => Promise<void>,
	run: (root: string) => Promise<void>
): Promise<void> {
	const tempDir = await fs.mkdtemp(TMP_PREFIX);

	try {
		await populate(tempDir);
		await run(tempDir);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}
