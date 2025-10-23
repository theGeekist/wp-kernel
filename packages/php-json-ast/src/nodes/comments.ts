export interface PhpCommentLocation {
	readonly line?: number;
	readonly filePos?: number;
	readonly tokenPos?: number;
	readonly endLine?: number;
	readonly endFilePos?: number;
	readonly endTokenPos?: number;
}

export interface PhpComment extends PhpCommentLocation {
	readonly nodeType: 'Comment' | `Comment_${string}`;
	readonly text: string;
}

export type PhpDocComment = PhpComment & { readonly nodeType: 'Comment_Doc' };

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
