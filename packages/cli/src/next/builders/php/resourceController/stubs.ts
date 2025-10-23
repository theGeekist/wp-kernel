import {
	buildComment,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	type PhpExprNew,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast';
import {
	buildPrintable,
	buildNode,
	buildReturn,
	buildArg,
	buildName,
} from '@wpkernel/php-json-ast';
import type { IRRoute } from '../../../../ir/types';

export interface AppendNotImplementedStubOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indent: string;
	readonly route: IRRoute;
}

export function appendNotImplementedStub(
	options: AppendNotImplementedStubOptions
): void {
	const todoPrintable = buildPrintable(
		buildStmtNop({
			comments: [
				buildComment(
					`// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`
				),
			],
		}),
		[
			`${options.indent}// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`,
		]
	);
	options.body.statement(todoPrintable);

	const errorExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildScalarInt(501)),
			buildArg(buildScalarString('Not Implemented')),
		],
	});
	const returnPrintable = buildPrintable(buildReturn(errorExpr), [
		`${options.indent}return new WP_Error( 501, 'Not Implemented' );`,
	]);
	options.body.statement(returnPrintable);
}
