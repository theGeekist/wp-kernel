/**
 * Represents the location of a PHP comment in the source code.
 *
 * @category PHP AST
 */
export interface PhpCommentLocation {
	readonly line?: number;
	readonly filePos?: number;
	readonly tokenPos?: number;
	readonly endLine?: number;
	readonly endFilePos?: number;
	readonly endTokenPos?: number;
}

/**
 * Represents a generic PHP comment.
 *
 * @category PHP AST
 */
export interface PhpComment extends PhpCommentLocation {
	readonly nodeType: 'Comment' | `Comment_${string}`;
	readonly text: string;
}

/**
 * Represents a PHP DocBlock comment.
 *
 * @category PHP AST
 */
export type PhpDocComment = PhpComment & { readonly nodeType: 'Comment_Doc' };

/**
 * Builds a generic PHP comment node.
 *
 * @category PHP AST
 * @param    text     - The text content of the comment.
 * @param    location - Optional location information for the comment.
 * @returns A `PhpComment` node.
 */
export function buildComment(
	text: string,
	location: PhpCommentLocation = {}
): PhpComment {
	return {
		nodeType: 'Comment',
		text,
		...location,
	};
}

function formatDocblockText(lines: readonly string[]): string {
	if (lines.length === 0) {
		return '/** */';
	}

	const trimmed = lines.map((line) => line.replace(/\s+$/u, ''));
	if (trimmed.length === 1) {
		return `/** ${trimmed[0]} */`;
	}

	const body = trimmed.map((line) => ` * ${line}`).join('\n');
	return ['/**', body, ' */'].join('\n');
}

/**
 * Builds a PHP DocBlock comment node.
 *
 * @category PHP AST
 * @param    lines    - An array of strings, where each string is a line of the docblock content.
 * @param    location - Optional location information for the comment.
 * @returns A `PhpDocComment` node.
 */
export function buildDocComment(
	lines: readonly string[],
	location: PhpCommentLocation = {}
): PhpDocComment {
	return {
		nodeType: 'Comment_Doc',
		text: formatDocblockText(lines),
		...location,
	};
}
