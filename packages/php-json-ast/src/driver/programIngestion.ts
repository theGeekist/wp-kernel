import type { Reporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/contracts';
import { getPhpBuilderChannel } from '../builderChannel';
import type { PhpProgram } from '../nodes';
import type { PipelineContext } from '../programBuilder';
import type { PhpFileMetadata } from '../types';
import type { PhpProgramCodemodResult } from '../codemods/types';
import {
	drainDelimitedLines,
	flushBufferedMessage,
	normaliseStringArray,
	parseMessage,
	toAsyncIterable,
} from './programIngestionUtils';

export interface PhpProgramIngestionMessage {
	readonly file: string;
	readonly program: PhpProgram;
	readonly metadata?: PhpFileMetadata;
	readonly docblock?: readonly string[];
	readonly uses?: readonly string[];
	readonly statements?: readonly string[];
	readonly codemod?: PhpProgramCodemodResult;
}

export type PhpProgramIngestionSource =
	| AsyncIterable<string | Buffer>
	| Iterable<string | Buffer>
	| NodeJS.ReadableStream;

export type {
	PhpProgramCodemodResult,
	PhpProgramCodemodVisitorSummary,
} from '../codemods/types';

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
			codemod: message.codemod,
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
