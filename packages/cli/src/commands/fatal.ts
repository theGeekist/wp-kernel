import process from 'node:process';
import { inspect } from 'node:util';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';

const CHANNEL = `${WPK_NAMESPACE}.cli`;
const PREFIX = `[${CHANNEL}][fatal]`;

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

export function emitFatalError(message: string, context?: unknown): void {
	const trimmedMessage = message.trim();
	const payload: string[] = [
		`${PREFIX} ${trimmedMessage.length > 0 ? trimmedMessage : 'Fatal error.'}`,
	];

	const contextPayload = serialiseContext(context);
	if (contextPayload) {
		payload.push(contextPayload);
	}

	process.stderr.write(`${payload.join(' ')}\n`);
}
