import process from 'node:process';
import { inspect } from 'node:util';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';

const CHANNEL = `${WPK_NAMESPACE}.cli`;
const PREFIX = `[${CHANNEL}][fatal]`;

export interface EmitFatalErrorOptions {
	readonly context?: unknown;
	readonly reporter?: Reporter;
}

function serialiseContext(context: unknown): string | null {
	if (context === null || typeof context === 'undefined') {
		return null;
	}

	if (typeof context === 'string') {
		return context;
	}

	try {
		return JSON.stringify(context);
	} catch (error) {
		try {
			return inspect(context, { depth: 5 });
		} catch {
			return inspect(error, { depth: 1 });
		}
	}
}

export function emitFatalError(
	message: string,
	options: EmitFatalErrorOptions = {}
): void {
	const trimmedMessage = message.trim();
	const resolvedMessage =
		trimmedMessage.length > 0 ? trimmedMessage : 'Fatal error.';

	if (options.reporter) {
		options.reporter.error(resolvedMessage, options.context);
		return;
	}

	const payload: string[] = [`${PREFIX} ${resolvedMessage}`];

	const contextPayload = serialiseContext(options.context);
	if (contextPayload) {
		payload.push(contextPayload);
	}

	process.stderr.write(`${payload.join('\n')}\n`);
}
