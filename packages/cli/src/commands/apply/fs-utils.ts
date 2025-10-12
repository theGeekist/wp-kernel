import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';

export async function statIfExists(filePath: string): Promise<Stats | null> {
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

export function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === 'ENOENT'
	);
}
