import fs from 'node:fs/promises';
import type { Reporter } from '@wpkernel/core/reporter';
import { toWorkspaceRelative } from '../../utils';
import type { ApplyLogEntry } from './types';
import { serialiseError } from './errors';

export async function appendApplyLog(
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
