import { DEFAULT_DOC_HEADER } from './constants';
import type { PhpFileBuilder } from './builder';

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
