import {
	buildDocComment,
	type PhpDocComment,
	type PhpAstBuilderAdapter,
} from '@wpkernel/php-json-ast';

import { DEFAULT_DOC_HEADER } from './constants';

export function appendGeneratedFileDocblock(
	builder: PhpAstBuilderAdapter,
	extraLines: Iterable<string>
): void {
	for (const line of DEFAULT_DOC_HEADER) {
		builder.appendDocblock(line);
	}

	for (const line of extraLines) {
		builder.appendDocblock(line);
	}
}

export function buildGeneratedFileDocComment(
	extraLines: Iterable<string>
): PhpDocComment {
	const lines = [...DEFAULT_DOC_HEADER, ...extraLines];
	return buildDocComment(lines);
}
