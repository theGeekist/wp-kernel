import type { Reporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/contracts';
import { getPhpBuilderChannel } from '../builderChannel';
import type { PhpProgram } from '../nodes';
import type { PipelineContext } from '../programBuilder';
import type { PhpFileMetadata } from '../types';

export interface PhpProgramIngestionMessage {
	readonly file: string;
	readonly program: PhpProgram;
	readonly metadata?: PhpFileMetadata;
	readonly docblock?: readonly string[];
	readonly uses?: readonly string[];
	readonly statements?: readonly string[];
}

export type PhpProgramIngestionSource =
	| AsyncIterable<string | Buffer>
	| Iterable<string | Buffer>
	| NodeJS.ReadableStream;

export interface ConsumePhpProgramIngestionOptions {
	readonly context: PipelineContext;
	readonly source: PhpProgramIngestionSource;
	readonly reporter?: Reporter;
	readonly defaultMetadata?: PhpFileMetadata;
	readonly resolveFilePath?: (message: PhpProgramIngestionMessage) => string;
}

const DEFAULT_METADATA: PhpFileMetadata = { kind: 'index-file' };

export async function consumePhpProgramIngestion(
	options: ConsumePhpProgramIngestionOptions
): Promise<void> {
	const reporter = options.reporter ?? options.context.reporter;
	const channel = getPhpBuilderChannel(options.context);

	let ingested = 0;
	for await (const message of readMessages(options.source)) {
		const file = resolveFilePath(message, options);
		const metadata = resolveMetadata(message, options);
		const docblock = normaliseStringArray(message.docblock);
		const uses = normaliseStringArray(message.uses);
		const statements = normaliseStringArray(message.statements);

		channel.queue({
			file,
			program: message.program,
			metadata,
			docblock,
			uses,
			statements,
		});

		ingested += 1;
		reporter.debug(
			'consumePhpProgramIngestion: queued program from PHP stream.',
			{
				file,
			}
		);
	}

	if (ingested === 0) {
		reporter.debug(
			'consumePhpProgramIngestion: source completed without emitting payloads.'
		);
	}
}

async function* readMessages(
	source: PhpProgramIngestionSource
): AsyncIterable<PhpProgramIngestionMessage> {
	let buffer = '';

	for await (const chunk of toAsyncIterable(source)) {
		buffer += chunk.toString();

		const drained = drainDelimitedLines(buffer);
		buffer = drained.remaining;
		for (const line of drained.lines) {
			yield parseMessage(line);
		}

		const flush = flushBufferedMessage(buffer);
		buffer = flush.remaining;

		if (flush.message) {
			yield flush.message;
		} else if (flush.error) {
			throw flush.error;
		}
	}

	const remaining = buffer.trim();
	if (remaining.length > 0) {
		yield parseMessage(remaining);
	}
}

async function* toAsyncIterable(
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

function parseMessage(line: string): PhpProgramIngestionMessage {
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

function isPhpProgramIngestionPayload(
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

	return true;
}

function resolveMetadata(
	message: PhpProgramIngestionMessage,
	options: ConsumePhpProgramIngestionOptions
): PhpFileMetadata {
	if (message.metadata) {
		return message.metadata;
	}

	if (options.defaultMetadata) {
		return options.defaultMetadata;
	}

	return DEFAULT_METADATA;
}

function resolveFilePath(
	message: PhpProgramIngestionMessage,
	options: ConsumePhpProgramIngestionOptions
): string {
	const file = options.resolveFilePath?.(message) ?? message.file;
	if (typeof file !== 'string' || file.length === 0) {
		throw new WPKernelError('DeveloperError', {
			message: 'Resolved ingestion file path was empty.',
			data: { file },
		});
	}

	return file;
}

function drainDelimitedLines(buffer: string): {
	remaining: string;
	lines: string[];
} {
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

function flushBufferedMessage(buffer: string): {
	remaining: string;
	message?: PhpProgramIngestionMessage;
	error?: unknown;
} {
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

function normaliseStringArray(value: unknown): readonly string[] {
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
