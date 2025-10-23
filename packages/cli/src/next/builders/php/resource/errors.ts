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
	buildPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT, escapeSingleQuotes } from '@wpkernel/php-json-ast';

export interface WpErrorReturnOptions {
	readonly indentLevel: number;
	readonly code: string;
	readonly message: string;
	readonly status?: number;
}

export function createWpErrorReturn(
	options: WpErrorReturnOptions
): PhpPrintable<PhpStmtReturn> {
	const { indentLevel, code, message, status = 400 } = options;
	const indent = PHP_INDENT.repeat(indentLevel);

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

	const returnNode = buildReturn(errorExpr);
	const line = `${indent}return new WP_Error( '${escapeSingleQuotes(
		code
	)}', '${escapeSingleQuotes(message)}', [ 'status' => ${status} ] );`;

	return buildPrintable(returnNode, [line]);
}
