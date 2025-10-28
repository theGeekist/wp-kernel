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
	type PhpStmt,
	type PhpStmtIf,
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

	const errorExpr = buildNew(buildName(['WP_Error']), [
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

	return buildReturn(errorExpr);
}

export interface WpErrorGuardOptions {
	readonly expression: PhpExpr;
	readonly statements: readonly PhpStmt[];
}

export function buildIsWpErrorGuard(options: WpErrorGuardOptions): PhpStmtIf {
	return buildIfStatement(
		buildFuncCall(buildName(['is_wp_error']), [
			buildArg(options.expression),
		]),
		[...options.statements]
	);
}

export function buildReturnIfWpError(expression: PhpExpr): PhpStmtIf {
	return buildIsWpErrorGuard({
		expression,
		statements: [buildReturn(expression)],
	});
}
