import {
	createComment,
	createScalarInt,
	createScalarString,
	createStmtNop,
	type PhpExprNew,
} from '../../ast/nodes';
import { createPrintable } from '../../ast/printables';
import {
	createNode,
	createReturn,
	createArg,
	createName,
} from '../../ast/nodes';
import type { PhpMethodBodyBuilder } from '../../ast/templates';
import type { IRRoute } from '../../../../../ir/types';

export interface AppendNotImplementedStubOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indent: string;
	readonly route: IRRoute;
}

export function appendNotImplementedStub(
	options: AppendNotImplementedStubOptions
): void {
	const todoPrintable = createPrintable(
		createStmtNop({
			comments: [
				createComment(
					`// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`
				),
			],
		}),
		[
			`${options.indent}// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`,
		]
	);
	options.body.statement(todoPrintable);

	const errorExpr = createNode<PhpExprNew>('Expr_New', {
		class: createName(['WP_Error']),
		args: [
			createArg(createScalarInt(501)),
			createArg(createScalarString('Not Implemented')),
		],
	});
	const returnPrintable = createPrintable(createReturn(errorExpr), [
		`${options.indent}return new WP_Error( 501, 'Not Implemented' );`,
	]);
	options.body.statement(returnPrintable);
}
