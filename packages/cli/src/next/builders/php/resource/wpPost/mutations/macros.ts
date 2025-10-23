import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildComment,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNode,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	buildNull,
	type PhpExpr,
	type PhpExprNew,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast';
import { buildPrintable, escapeSingleQuotes } from '@wpkernel/php-json-ast';
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
		expression: buildVariable(name),
		display: `$${name}`,
	};
}

export function buildArrayDimExpression(
	array: string,
	key: string
): MacroExpression {
	const escapedKey = escapeSingleQuotes(key);
	return {
		expression: buildArrayDimFetch(array, buildScalarString(key)),
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

	const statusAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				statusVariable.expression,
				buildMethodCall(
					requestVariable.expression,
					buildIdentifier('get_param'),
					[buildArg(buildScalarString(statusParam))]
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

	const normalisedCall = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`normalise${options.pascalName}Status`),
		[buildArg(statusVariable.expression)]
	);

	if (options.guardWithNullCheck) {
		const childIndent = indentUnit.repeat(options.indentLevel + 1);
		const guardedAssign = buildPrintable(
			buildExpressionStatement(
				buildAssign(options.target.expression, normalisedCall)
			),
			[
				`${childIndent}${options.target.display} = $this->normalise${options.pascalName}Status( ${statusVariable.display} );`,
			]
		);
		const guard = buildIfPrintable({
			indentLevel: options.indentLevel,
			condition: buildBinaryOperation(
				'NotIdentical',
				buildNull(),
				statusVariable.expression
			),
			conditionText: `${indent}if ( null !== ${statusVariable.display} ) {`,
			statements: [guardedAssign],
		});
		options.body.statement(guard);
		return;
	}

	const directAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(options.target.expression, normalisedCall)
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
	const call = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`sync${options.pascalName}Meta`),
		[
			buildArg(options.postId.expression),
			buildArg(requestVariable.expression),
		]
	);
	const printable = buildPrintable(buildExpressionStatement(call), [
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
	const assign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				options.resultVariable.expression,
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`sync${options.pascalName}Taxonomies`),
					[
						buildArg(options.postId.expression),
						buildArg(requestVariable.expression),
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
	const returnPrintable = buildPrintable(
		buildReturn(options.resultVariable.expression),
		[`${childIndent}return ${options.resultVariable.display};`]
	);
	const guard = buildIfPrintable({
		indentLevel: options.indentLevel,
		condition: buildFuncCall(buildName(['is_wp_error']), [
			buildArg(options.resultVariable.expression),
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

	const loadPost = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				postVariable.expression,
				buildFuncCall(buildName(['get_post']), [
					buildArg(options.postId.expression),
				])
			)
		),
		[
			`${indent}${postVariable.display} = get_post( ${options.postId.display} );`,
		]
	);
	options.body.statement(loadPost);

	const childIndent = indentUnit.repeat(options.indentLevel + 1);
	const failureExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildScalarString(options.errorCode)),
			buildArg(
				buildScalarString(escapeSingleQuotes(options.failureMessage))
			),
			buildArg(
				buildArray([
					buildArrayItem(buildScalarInt(500), {
						key: buildScalarString('status'),
					}),
				])
			),
		],
	});
	const failureReturn = buildPrintable(buildReturn(failureExpr), [
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

	const responseCall = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`prepare${options.pascalName}Response`),
		[
			buildArg(postVariable.expression),
			buildArg(requestVariable.expression),
		]
	);
	const responsePrintable = buildPrintable(buildReturn(responseCall), [
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
	const printable = buildPrintable(
		buildStmtNop({ comments: [buildComment(text)] }),
		[`${indent}${text}`]
	);
	options.body.statement(printable);
}
