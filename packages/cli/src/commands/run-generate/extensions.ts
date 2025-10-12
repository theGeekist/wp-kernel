import type { AdapterExtensionRunResult } from '../../adapters';
import type { Reporter } from '@geekist/wp-kernel';
import { reportError, serialiseError } from './reporting';

export async function commitExtensions(
	extensionsRun: AdapterExtensionRunResult | undefined,
	reporter: Reporter
): Promise<Error | undefined> {
	if (!extensionsRun) {
		return undefined;
	}

	try {
		await extensionsRun.commit();
		return undefined;
	} catch (error) {
		await rollbackExtensions(extensionsRun, reporter);
		const normalised =
			error instanceof Error ? error : new Error(String(error));
		reportError(
			reporter,
			'Adapter extension commit failed.',
			normalised,
			'adapter'
		);
		return normalised;
	}
}

export async function rollbackExtensions(
	extensionsRun: AdapterExtensionRunResult,
	reporter: Reporter
): Promise<void> {
	try {
		await extensionsRun.rollback();
	} catch (error) {
		reporter
			.child('adapter')
			.warn(
				'Failed to rollback adapter extensions.',
				serialiseError(error)
			);
	}
}

export class AdapterEvaluationError extends Error {
	constructor(public readonly original: Error) {
		super(original.message);
		this.name = 'AdapterEvaluationError';
		this.stack = original.stack;
	}
}
