import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNode,
	buildVariable,
	type PhpStmt,
	type PhpStmtContinue,
	type PhpStmtForeach,
	type PhpPrintable,
	buildIfStatement,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
	buildArrayInitialiserStatement,
} from '../utils';
import { formatStatementPrintable } from '../printer';

export interface ListItemsInitialiserOptions {
	readonly indentLevel: number;
}

export function createListItemsInitialiser(
	options: ListItemsInitialiserOptions
): PhpPrintable<PhpStmt> {
	const statement = buildArrayInitialiserStatement({ variable: 'items' });

	return formatStatementPrintable(statement, {
		indentLevel: options.indentLevel,
		indentUnit: PHP_INDENT,
	});
}

export interface ListForeachOptions {
	readonly pascalName: string;
	readonly indentLevel: number;
}

export function createListForeachPrintable(
	options: ListForeachOptions
): PhpPrintable<PhpStmtForeach> {
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

	const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildPropertyFetch('query', 'posts'),
		valueVar: buildVariable('post_id'),
		keyVar: null,
		byRef: false,
		stmts: [assignment, guard, pushStatement],
	});
	return formatStatementPrintable(foreachNode, {
		indentLevel: options.indentLevel,
		indentUnit: PHP_INDENT,
	});
}
