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
} from '@wpkernel/php-json-ast';

export interface WpErrorReturnOptions {
	readonly code: string;
	readonly message: string;
	readonly status?: number;
}

export function buildWpErrorReturn(
	options: WpErrorReturnOptions
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
