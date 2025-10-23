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
	type PhpStmtIf,
	buildPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildArrayInitialiser,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
} from '../utils';

export interface ListItemsInitialiserOptions {
	readonly indentLevel: number;
}

export function createListItemsInitialiser(
	options: ListItemsInitialiserOptions
): PhpPrintable<PhpStmt> {
	return buildArrayInitialiser({
		variable: 'items',
		indentLevel: options.indentLevel,
	});
}

export interface ListForeachOptions {
	readonly pascalName: string;
	readonly indentLevel: number;
}

export function createListForeachPrintable(
	options: ListForeachOptions
): PhpPrintable<PhpStmtForeach> {
	const indent = PHP_INDENT.repeat(options.indentLevel);
	const childIndent = PHP_INDENT.repeat(options.indentLevel + 1);
	const nestedIndent = PHP_INDENT.repeat(options.indentLevel + 2);

	const assignment = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post'),
				buildFuncCall(buildName(['get_post']), [
					buildArg(buildVariable('post_id')),
				])
			)
		),
		[`${childIndent}$post = get_post( $post_id );`]
	);

	const continuePrintable = buildPrintable(
		buildNode<PhpStmtContinue>('Stmt_Continue', { num: null }),
		[`${nestedIndent}continue;`]
	);

	const guard = buildPrintable(
		buildNode<PhpStmtIf>('Stmt_If', {
			cond: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
			stmts: [continuePrintable.node],
			elseifs: [],
			else: null,
		}),
		[
			`${childIndent}if ( ! $post instanceof WP_Post ) {`,
			...continuePrintable.lines,
			`${childIndent}}`,
		]
	);

	const pushPrintable = buildPrintable(
		buildExpressionStatement(
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
		),
		[
			`${childIndent}$items[] = $this->prepare${options.pascalName}Response( $post, $request );`,
		]
	);

	const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildPropertyFetch('query', 'posts'),
		valueVar: buildVariable('post_id'),
		keyVar: null,
		byRef: false,
		stmts: [assignment.node, guard.node, pushPrintable.node],
	});

	const lines = [
		`${indent}foreach ( $query->posts as $post_id ) {`,
		...assignment.lines,
		...guard.lines,
		'',
		...pushPrintable.lines,
		`${indent}}`,
	];

	return buildPrintable(foreachNode, lines);
}
