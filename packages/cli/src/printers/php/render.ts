import type { PhpFileAst } from './builder';

export function renderPhpFile(ast: PhpFileAst): string {
	const lines: string[] = ['<?php', 'declare(strict_types=1);', ''];

	if (ast.docblock.length > 0) {
		lines.push(...formatDocblock(ast.docblock), '');
	}

	if (ast.namespace) {
		lines.push(`namespace ${ast.namespace};`, '');
	}

	if (ast.uses.length > 0) {
		for (const use of ast.uses) {
			lines.push(`use ${use};`);
		}

		lines.push('');
	}

	lines.push('// WPK:BEGIN AUTO');
	lines.push(...ast.statements);
	lines.push('// WPK:END AUTO', '');

	return ensureTrailingNewline(lines.join('\n'));
}

function formatDocblock(lines: readonly string[]): string[] {
	return ['/**', ...lines.map((line) => ` * ${line}`), ' */'];
}

function ensureTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}
