import { DEFAULT_DOC_HEADER } from './constants';
import { createDocComment, type PhpDocComment } from './nodes';
import type { PhpFileBuilder } from './programBuilder';

export function appendGeneratedFileDocblock(
	builder: PhpFileBuilder,
	extraLines: Iterable<string>
): void {
	for (const line of DEFAULT_DOC_HEADER) {
		builder.appendDocblock(line);
	}

	for (const line of extraLines) {
		builder.appendDocblock(line);
	}
}

export function createGeneratedFileDocComment(
	extraLines: Iterable<string>
): PhpDocComment {
	const lines = [...DEFAULT_DOC_HEADER, ...extraLines];
	return createDocComment(lines);
}
