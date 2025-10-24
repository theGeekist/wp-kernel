import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildName,
	buildNode,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	type PhpExprNew,
	type PhpStmtReturn,
	type PhpPrintable,
	PHP_INDENT,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from './printer';

export interface WpErrorReturnAstOptions {
	readonly code: string;
	readonly message: string;
	readonly status?: number;
}

export interface WpErrorReturnOptions extends WpErrorReturnAstOptions {
	readonly indentLevel: number;
	readonly indentUnit?: string;
}

export function buildWpErrorReturn(
	options: WpErrorReturnAstOptions
): PhpStmtReturn {
	const { code, message, status = 400 } = options;

	const errorExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildScalarString(code)),
			buildArg(buildScalarString(message)),
			buildArg(
				buildArray([
					buildArrayItem(buildScalarInt(status), {
						key: buildScalarString('status'),
					}),
				])
			),
		],
	});

	return buildReturn(errorExpr);
}

export function createWpErrorReturn(
	options: WpErrorReturnOptions
): PhpPrintable<PhpStmtReturn> {
	const node = buildWpErrorReturn(options);
	return formatStatementPrintable(node, {
		indentLevel: options.indentLevel,
		indentUnit: options.indentUnit ?? PHP_INDENT,
	});
}
