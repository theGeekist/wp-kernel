import {
	buildArg,
	buildAssign,
	buildContinue,
	buildExpressionStatement,
	buildForeach,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildVariable,
	type PhpStmt,
	type PhpStmtForeach,
} from '@wpkernel/php-json-ast';

import {
	buildArrayDimFetch,
	buildArrayInitialiserStatement,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
} from '../../common/utils';

/**
 * @category WordPress AST
 */
export function buildListItemsInitialiserStatement(): PhpStmt {
	return buildArrayInitialiserStatement({ variable: 'items' });
}

/**
 * @category WordPress AST
 */
export interface ListForeachOptions {
	readonly pascalName: string;
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildListForeachStatement(
	options: ListForeachOptions
): PhpStmtForeach {
	const assignment = buildExpressionStatement(
		buildAssign(
			buildVariable('post'),
			buildFuncCall(buildName(['get_post']), [
				buildArg(buildVariable('post_id')),
			])
		)
	);

	const continueStatement = buildContinue();

	const guard = buildIfStatement(
		buildBooleanNot(buildInstanceof('post', 'WP_Post')),
		[continueStatement]
	);

	const pushStatement = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('items', null),
			buildMethodCall(
				buildVariable('this'),
				buildIdentifier(`prepare${options.pascalName}Response`),
				[
					buildArg(buildVariable('post')),
					buildArg(buildVariable('request')),
				]
			)
		)
	);

	return buildForeach(buildPropertyFetch('query', 'posts'), {
		valueVar: buildVariable('post_id'),
		keyVar: null,
		stmts: [assignment, guard, pushStatement],
	});
}
