import {
	buildArg,
	buildArray,
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
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
	// buildArrayInitialiserStatement,
} from '../utils';

export function buildListItemsInitialiserStatement(): PhpStmt {
	return buildExpressionStatement(
		buildAssign(buildVariable('items'), buildArray([]))
	);
}

export interface ListForeachOptions {
	readonly pascalName: string;
}

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
