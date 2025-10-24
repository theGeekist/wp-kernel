import {
	buildArg,
	buildArray,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNode,
	buildVariable,
	type PhpStmt,
	type PhpStmtContinue,
	type PhpStmtForeach,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
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

	const continueStatement = buildNode<PhpStmtContinue>('Stmt_Continue', {
		num: null,
	});

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

	return buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildPropertyFetch('query', 'posts'),
		valueVar: buildVariable('post_id'),
		keyVar: null,
		byRef: false,
		stmts: [assignment, guard, pushStatement],
	});
}
