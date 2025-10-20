import {
	createArg,
	createArray,
	createArrayItem,
	createName,
	createNode,
	createReturn,
	createScalarInt,
	createScalarString,
	type PhpExprNew,
	type PhpStmtReturn,
} from '../../ast/nodes';
import { createPrintable, type PhpPrintable } from '../../ast/printables';
import { PHP_INDENT } from '../../ast/templates';
import { escapeSingleQuotes } from '../../ast/utils';

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

	const errorExpr = createNode<PhpExprNew>('Expr_New', {
		class: createName(['WP_Error']),
		args: [
			createArg(createScalarString(code)),
			createArg(createScalarString(message)),
			createArg(
				createArray([
					createArrayItem(createScalarInt(status), {
						key: createScalarString('status'),
					}),
				])
			),
		],
	});

	const returnNode = createReturn(errorExpr);
	const line = `${indent}return new WP_Error( '${escapeSingleQuotes(
		code
	)}', '${escapeSingleQuotes(message)}', array( 'status' => ${status} ) );`;

	return createPrintable(returnNode, [line]);
}
