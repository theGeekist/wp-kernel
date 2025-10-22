import {
	createArg,
	createArray,
	createArrayItem,
	createAssign,
	createComment,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createNode,
	createReturn,
	createScalarInt,
	createScalarString,
	createStmtNop,
	createVariable,
	createNull,
	type PhpExpr,
	type PhpExprNew,
} from '@wpkernel/php-json-ast/nodes';
import { createPrintable, escapeSingleQuotes } from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast/templates';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildInstanceof,
	buildPropertyFetch,
} from '../../utils';
import type { ResourceMutationContract } from '../../mutationContract';

export interface MacroExpression {
	readonly expression: PhpExpr;
	readonly display: string;
}

export function buildVariableExpression(name: string): MacroExpression {
	return {
		expression: createVariable(name),
		display: `$${name}`,
	};
}

export function buildArrayDimExpression(
	array: string,
	key: string
): MacroExpression {
	const escapedKey = escapeSingleQuotes(key);
	return {
		expression: buildArrayDimFetch(array, createScalarString(key)),
		display: `$${array}['${escapedKey}']`,
	};
}

export function buildPropertyExpression(
	object: string,
	property: string
): MacroExpression {
	return {
		expression: buildPropertyFetch(object, property),
		display: `$${object}->${property}`,
	};
}

interface MacroOptionsBase {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly indentUnit?: string;
	readonly metadataKeys: ResourceMutationContract['metadataKeys'];
}

export interface StatusValidationMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly target: MacroExpression;
	readonly statusVariable?: MacroExpression;
	readonly requestVariable?: MacroExpression;
	readonly statusParam?: string;
	readonly guardWithNullCheck?: boolean;
}

export interface SyncMetaMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly postId: MacroExpression;
	readonly requestVariable?: MacroExpression;
}

export interface SyncTaxonomiesMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly postId: MacroExpression;
	readonly resultVariable: MacroExpression;
	readonly requestVariable?: MacroExpression;
}

export interface CachePrimingMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly postId: MacroExpression;
	readonly errorCode: string;
	readonly failureMessage: string;
	readonly requestVariable?: MacroExpression;
	readonly postVariableName?: string;
}

export function appendStatusValidationMacro(
	options: StatusValidationMacroOptions
): void {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);

	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'status-validation'
	);
	appendMetadataComment(
		options,
		options.metadataKeys.statusValidation,
		'normalise'
	);

	const statusVariable =
		options.statusVariable ?? buildVariableExpression('status');
	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const statusParam = options.statusParam ?? 'status';

	const statusAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				statusVariable.expression,
				createMethodCall(
					requestVariable.expression,
					createIdentifier('get_param'),
					[createArg(createScalarString(statusParam))]
				)
			)
		),
		[
			`${indent}${statusVariable.display} = ${requestVariable.display}->get_param( '${escapeSingleQuotes(
				statusParam
			)}' );`,
		]
	);
	options.body.statement(statusAssign);

	const normalisedCall = createMethodCall(
		createVariable('this'),
		createIdentifier(`normalise${options.pascalName}Status`),
		[createArg(statusVariable.expression)]
	);

	if (options.guardWithNullCheck) {
		const childIndent = indentUnit.repeat(options.indentLevel + 1);
		const guardedAssign = createPrintable(
			createExpressionStatement(
				createAssign(options.target.expression, normalisedCall)
			),
			[
				`${childIndent}${options.target.display} = $this->normalise${options.pascalName}Status( ${statusVariable.display} );`,
			]
		);
		const guard = buildIfPrintable({
			indentLevel: options.indentLevel,
			condition: buildBinaryOperation(
				'NotIdentical',
				createNull(),
				statusVariable.expression
			),
			conditionText: `${indent}if ( null !== ${statusVariable.display} ) {`,
			statements: [guardedAssign],
		});
		options.body.statement(guard);
		return;
	}

	const directAssign = createPrintable(
		createExpressionStatement(
			createAssign(options.target.expression, normalisedCall)
		),
		[
			`${indent}${options.target.display} = $this->normalise${options.pascalName}Status( ${statusVariable.display} );`,
		]
	);
	options.body.statement(directAssign);
}

export function appendSyncMetaMacro(options: SyncMetaMacroOptions): void {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);

	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'sync-meta'
	);
	appendMetadataComment(options, options.metadataKeys.syncMeta, 'update');

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const call = createMethodCall(
		createVariable('this'),
		createIdentifier(`sync${options.pascalName}Meta`),
		[
			createArg(options.postId.expression),
			createArg(requestVariable.expression),
		]
	);
	const printable = createPrintable(createExpressionStatement(call), [
		`${indent}$this->sync${options.pascalName}Meta( ${options.postId.display}, ${requestVariable.display} );`,
	]);
	options.body.statement(printable);
}

export function appendSyncTaxonomiesMacro(
	options: SyncTaxonomiesMacroOptions
): void {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);

	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'sync-taxonomies'
	);
	appendMetadataComment(
		options,
		options.metadataKeys.syncTaxonomies,
		'update'
	);

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const assign = createPrintable(
		createExpressionStatement(
			createAssign(
				options.resultVariable.expression,
				createMethodCall(
					createVariable('this'),
					createIdentifier(`sync${options.pascalName}Taxonomies`),
					[
						createArg(options.postId.expression),
						createArg(requestVariable.expression),
					]
				)
			)
		),
		[
			`${indent}${options.resultVariable.display} = $this->sync${options.pascalName}Taxonomies( ${options.postId.display}, ${requestVariable.display} );`,
		]
	);
	options.body.statement(assign);

	const childIndent = indentUnit.repeat(options.indentLevel + 1);
	const returnPrintable = createPrintable(
		createReturn(options.resultVariable.expression),
		[`${childIndent}return ${options.resultVariable.display};`]
	);
	const guard = buildIfPrintable({
		indentLevel: options.indentLevel,
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(options.resultVariable.expression),
		]),
		conditionText: `${indent}if ( is_wp_error( ${options.resultVariable.display} ) ) {`,
		statements: [returnPrintable],
	});
	options.body.statement(guard);
}

export function appendCachePrimingMacro(
	options: CachePrimingMacroOptions
): void {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);

	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'cache-priming'
	);
	appendMetadataComment(options, options.metadataKeys.cachePriming, 'prime');
	appendMetadataComment(options, options.metadataKeys.cacheSegment, 'prime');

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const postVariableName = options.postVariableName ?? 'post';
	const postVariable = buildVariableExpression(postVariableName);

	const loadPost = createPrintable(
		createExpressionStatement(
			createAssign(
				postVariable.expression,
				createFuncCall(createName(['get_post']), [
					createArg(options.postId.expression),
				])
			)
		),
		[
			`${indent}${postVariable.display} = get_post( ${options.postId.display} );`,
		]
	);
	options.body.statement(loadPost);

	const childIndent = indentUnit.repeat(options.indentLevel + 1);
	const failureExpr = createNode<PhpExprNew>('Expr_New', {
		class: createName(['WP_Error']),
		args: [
			createArg(createScalarString(options.errorCode)),
			createArg(
				createScalarString(escapeSingleQuotes(options.failureMessage))
			),
			createArg(
				createArray([
					createArrayItem(createScalarInt(500), {
						key: createScalarString('status'),
					}),
				])
			),
		],
	});
	const failureReturn = createPrintable(createReturn(failureExpr), [
		`${childIndent}return new WP_Error( '${escapeSingleQuotes(
			options.errorCode
		)}', '${escapeSingleQuotes(
			options.failureMessage
		)}', [ 'status' => 500 ] );`,
	]);
	const guard = buildIfPrintable({
		indentLevel: options.indentLevel,
		condition: buildBooleanNot(
			buildInstanceof(postVariableName, 'WP_Post')
		),
		conditionText: `${indent}if ( ! ${postVariable.display} instanceof WP_Post ) {`,
		statements: [failureReturn],
	});
	options.body.statement(guard);

	const responseCall = createMethodCall(
		createVariable('this'),
		createIdentifier(`prepare${options.pascalName}Response`),
		[
			createArg(postVariable.expression),
			createArg(requestVariable.expression),
		]
	);
	const responsePrintable = createPrintable(createReturn(responseCall), [
		`${indent}return $this->prepare${options.pascalName}Response( ${postVariable.display}, ${requestVariable.display} );`,
	]);
	options.body.statement(responsePrintable);
}

function appendMetadataComment(
	options: MacroOptionsBase,
	key: string,
	value: string
): void {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);
	const text = `// @wp-kernel ${key} ${value}`;
	const printable = createPrintable(
		createStmtNop({ comments: [createComment(text)] }),
		[`${indent}${text}`]
	);
	options.body.statement(printable);
}
