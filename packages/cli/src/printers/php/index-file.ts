import path from 'node:path';
import type { PrinterContext } from '../types';
import { DEFAULT_DOC_HEADER } from './constants';
import { PHP_INDENT } from './template';

export function createPhpIndexFile(options: {
	indexPath: string;
	namespaceRoot: string;
	baseControllerPath: string;
	policyHelperPath: string;
	resourceEntries: { className: string; path: string }[];
	persistencePath: string;
	context: PrinterContext;
}): string {
	const indexDir = path.dirname(options.indexPath);

	const entries = [
		{
			className: `${options.namespaceRoot}\\Rest\\BaseController`,
			path: options.baseControllerPath,
		},
		{
			className: `${options.namespaceRoot}\\Policy\\Policy`,
			path: options.policyHelperPath,
		},
		...options.resourceEntries,
		{
			className: `${options.namespaceRoot}\\Registration\\PersistenceRegistry`,
			path: options.persistencePath,
		},
	];

	const lines: string[] = ['<?php', 'declare(strict_types=1);', ''];
	lines.push('/**');
	for (const line of DEFAULT_DOC_HEADER) {
		lines.push(` * ${line}`);
	}
	lines.push(` * Source: ${options.context.ir.meta.origin} → php/index`);
	lines.push(' */', '', 'return [');

	for (const entry of entries) {
		const relative = path
			.relative(indexDir, entry.path)
			.split(path.sep)
			.join('/');
		const suffix = relative.startsWith('/') ? relative : `/${relative}`;
		lines.push(
			`${PHP_INDENT}'${entry.className}' => __DIR__ . '${suffix}',`
		);
	}

	lines.push('];', '');
	return lines.join('\n');
}
