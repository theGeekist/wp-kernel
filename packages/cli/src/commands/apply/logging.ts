import { serialiseError } from './errors';
import { APPLY_LOG_PATH } from './constants';
import type { ApplyLogEntry, FailureLogOptions } from './types';

export async function appendApplyLog(
	workspace: FailureLogOptions['workspace'],
	entry: ApplyLogEntry
): Promise<void> {
	const previous = await workspace.readText(APPLY_LOG_PATH);
	const serialised = JSON.stringify(entry);
	const trimmedPrevious = previous?.replace(/\s+$/, '') ?? '';
	const nextContents =
		trimmedPrevious.length > 0
			? `${trimmedPrevious}\n${serialised}\n`
			: `${serialised}\n`;

	await workspace.write(APPLY_LOG_PATH, nextContents, { ensureDir: true });
}

export async function handleFailureLog({
	workspace,
	dependencies,
	flags,
	exitCode,
	error,
}: FailureLogOptions): Promise<void> {
	await dependencies
		.appendApplyLog(workspace, {
			version: 1,
			timestamp: new Date().toISOString(),
			status: 'failed',
			exitCode,
			flags,
			summary: null,
			records: [],
			actions: [],
			error: serialiseError(error),
		})
		.catch(() => undefined);
}
