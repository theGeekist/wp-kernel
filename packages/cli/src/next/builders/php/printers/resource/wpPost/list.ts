import {
	createArg,
	createArray,
	createAssign,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createNode,
	createVariable,
	type PhpExprBooleanNot,
	type PhpStmt,
	type PhpStmtContinue,
	type PhpStmtForeach,
	type PhpStmtIf,
} from '../../../ast/nodes';
import { createPrintable, type PhpPrintable } from '../../../ast/printables';
import { PHP_INDENT } from '../../../ast/templates';
import {
	createArrayDimFetch,
	createInstanceof,
	createPropertyFetch,
} from '../utils';

export interface ListItemsInitialiserOptions {
	readonly indentLevel: number;
}

export function createListItemsInitialiser(
	options: ListItemsInitialiserOptions
): PhpPrintable<PhpStmt> {
	const indent = PHP_INDENT.repeat(options.indentLevel);
	return createPrintable(
		createExpressionStatement(
			createAssign(createVariable('items'), createArray([]))
		),
		[`${indent}$items = array();`]
	);
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

	const assignment = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post'),
				createFuncCall(createName(['get_post']), [
					createArg(createVariable('post_id')),
				])
			)
		),
		[`${childIndent}$post = get_post( $post_id );`]
	);

	const continuePrintable = createPrintable(
		createNode<PhpStmtContinue>('Stmt_Continue', { num: null }),
		[`${nestedIndent}continue;`]
	);

	const guard = createPrintable(
		createNode<PhpStmtIf>('Stmt_If', {
			cond: createNode<PhpExprBooleanNot>('Expr_BooleanNot', {
				expr: createInstanceof('post', 'WP_Post'),
			}),
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

	const pushPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createArrayDimFetch('items', null),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`prepare${options.pascalName}Response`),
					[
						createArg(createVariable('post')),
						createArg(createVariable('request')),
					]
				)
			)
		),
		[
			`${childIndent}$items[] = $this->prepare${options.pascalName}Response( $post, $request );`,
		]
	);

	const foreachNode = createNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: createPropertyFetch('query', 'posts'),
		valueVar: createVariable('post_id'),
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

	return createPrintable(foreachNode, lines);
}
