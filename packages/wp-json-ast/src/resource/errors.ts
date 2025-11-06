import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildFuncCall,
	buildIfStatement,
	buildName,
	buildNew,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	type PhpExpr,
	type PhpExprNew,
	type PhpStmt,
	type PhpStmtIf,
	type PhpStmtReturn,
} from '@wpkernel/php-json-ast';

/**
 * @category WordPress AST
 */
export interface WpErrorReturnOptions {
	readonly code: string;
	readonly message: string;
	readonly status?: number;
}

/**
 * @category WordPress AST
 */
export interface WpErrorGuardOptions {
	readonly expression: PhpExpr;
	readonly statements: readonly PhpStmt[];
}

/**
 * @category WordPress AST
 */
export type WpErrorExpressionOptions = WpErrorReturnOptions;

/**
 * @param    options
 * @category WordPress AST
 */
export function buildWpErrorExpression(
	options: WpErrorExpressionOptions
): PhpExprNew {
	const { code, message, status = 400 } = options;

	return buildNew(buildName(['WP_Error']), [
		buildArg(buildScalarString(code)),
		buildArg(buildScalarString(message)),
		buildArg(
			buildArray([
				buildArrayItem(buildScalarInt(status), {
					key: buildScalarString('status'),
				}),
			])
		),
	]);
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildWpErrorReturn(
	options: WpErrorReturnOptions
): PhpStmtReturn {
	return buildReturn(buildWpErrorExpression(options));
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildIsWpErrorGuard(options: WpErrorGuardOptions): PhpStmtIf {
	return buildIfStatement(
		buildFuncCall(buildName(['is_wp_error']), [
			buildArg(options.expression),
		]),
		[...options.statements]
	);
}

/**
 * @param    expression
 * @category WordPress AST
 */
export function buildReturnIfWpError(expression: PhpExpr): PhpStmtIf {
	return buildIsWpErrorGuard({
		expression,
		statements: [buildReturn(expression)],
	});
}
