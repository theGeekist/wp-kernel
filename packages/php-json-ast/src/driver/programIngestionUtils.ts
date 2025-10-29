import { WPKernelError } from '@wpkernel/core/contracts';
import type { PhpProgramCodemodResult } from '../codemods/types';
import type {
	PhpProgramIngestionMessage,
	PhpProgramIngestionSource,
} from './programIngestion';

export interface DelimitedLinesResult {
	readonly remaining: string;
	readonly lines: string[];
}

export interface FlushBufferedMessageResult {
	readonly remaining: string;
	readonly message?: PhpProgramIngestionMessage;
	readonly error?: unknown;
}

export async function* toAsyncIterable(
	source: PhpProgramIngestionSource
): AsyncIterable<string | Buffer> {
	if (Symbol.asyncIterator in source) {
		for await (const chunk of source as AsyncIterable<string | Buffer>) {
			yield chunk;
		}
		return;
	}

	if (Symbol.iterator in source) {
		for (const chunk of source as Iterable<string | Buffer>) {
			yield chunk;
		}
		return;
	}

	throw new WPKernelError('DeveloperError', {
		message: 'Unsupported ingestion source provided.',
		data: {
			received: typeof source,
		},
	});
}

export function drainDelimitedLines(buffer: string): DelimitedLinesResult {
	const lines: string[] = [];
	let remaining = buffer;

	while (true) {
		const newlineIndex = remaining.indexOf('\n');
		if (newlineIndex === -1) {
			break;
		}

		const line = remaining.slice(0, newlineIndex);
		remaining = remaining.slice(newlineIndex + 1);

		if (line.trim().length === 0) {
			continue;
		}

		lines.push(line);
	}

	return { remaining, lines };
}

export function flushBufferedMessage(
	buffer: string
): FlushBufferedMessageResult {
	const trimmed = buffer.trim();
	if (trimmed.length === 0 || !trimmed.endsWith('}')) {
		return { remaining: buffer };
	}

	try {
		return {
			remaining: '',
			message: parseMessage(trimmed),
		};
	} catch (error) {
		if (error instanceof WPKernelError && error.code === 'DeveloperError') {
			return { remaining: trimmed };
		}

		return { remaining: buffer, error };
	}
}

export function normaliseStringArray(value: unknown): readonly string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const result: string[] = [];
	for (const entry of value) {
		if (typeof entry === 'string') {
			result.push(entry);
		}
	}

	return result;
}

export function parseMessage(line: string): PhpProgramIngestionMessage {
	let payload: unknown;

	try {
		payload = JSON.parse(line);
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to decode PHP ingestion payload.',
			data: {
				line,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
	}

	if (!isPhpProgramIngestionPayload(payload)) {
		throw new WPKernelError('DeveloperError', {
			message: 'Invalid PHP ingestion payload received.',
			data: { payload },
		});
	}

	return payload;
}

export function isPhpProgramIngestionPayload(
	payload: unknown
): payload is PhpProgramIngestionMessage {
	if (payload === null || typeof payload !== 'object') {
		return false;
	}

	const candidate = payload as Record<string, unknown>;
	if (typeof candidate.file !== 'string') {
		return false;
	}

	if (!Array.isArray(candidate.program)) {
		return false;
	}

	if (
		candidate.codemod !== undefined &&
		!isPhpProgramCodemodResult(candidate.codemod)
	) {
		return false;
	}

	return true;
}

export function isPhpProgramCodemodResult(
	value: unknown
): value is PhpProgramCodemodResult {
	if (value === null || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	if (!Array.isArray(candidate.before) || !Array.isArray(candidate.after)) {
		return false;
	}

	if (!Array.isArray(candidate.visitors)) {
		return false;
	}

	return candidate.visitors.every((visitor) => {
		if (visitor === null || typeof visitor !== 'object') {
			return false;
		}

		const summary = visitor as Record<string, unknown>;
		return (
			typeof summary.key === 'string' &&
			typeof summary.stackKey === 'string' &&
			typeof summary.stackIndex === 'number' &&
			Number.isInteger(summary.stackIndex) &&
			typeof summary.visitorIndex === 'number' &&
			Number.isInteger(summary.visitorIndex) &&
			typeof summary.class === 'string'
		);
	});
}
