import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildArrayCast as buildArrayCastNode,
	buildAssign,
	buildArrowFunction,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMatch,
	buildMatchArm,
	buildMethodCall,
	buildName,
	buildNull,
	buildParam,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpStmt,
	buildPrintable,
	type PhpPrintable,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	escapeSingleQuotes,
	toSnakeCase,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildArrayInitialiser,
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildScalarCast,
} from '../utils';

export interface WpPostMetaConfigEntry {
	readonly single?: boolean | null;
}

export interface WpPostMetaQueryConfig {
	readonly meta?: Record<
		string,
		WpPostMetaConfigEntry | null | undefined
	> | null;
}

export function collectMetaQueryEntries(
	storage: WpPostMetaQueryConfig
): Array<[string, { single?: boolean | null } | undefined]> {
	const entries: Array<[string, { single?: boolean | null } | undefined]> =
		[];

	for (const [key, descriptor] of Object.entries(storage.meta ?? {})) {
		if (!descriptor) {
			entries.push([key, undefined]);
			continue;
		}

		entries.push([key, { single: descriptor.single }]);
	}

	return entries;
}

export interface AppendMetaQueryBuilderOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly entries: Array<[string, { single?: boolean | null } | undefined]>;
}

export function appendMetaQueryBuilder(
	options: AppendMetaQueryBuilderOptions
): void {
	if (options.entries.length === 0) {
		return;
	}

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);

	const initPrintable = buildArrayInitialiser({
		variable: 'meta_query',
		indentLevel,
	});
	options.body.statement(initPrintable);

	for (const [key, descriptor] of options.entries) {
		const variableName = `${toSnakeCase(key)}Meta`;
		const requestPrintable = buildPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildMethodCall(
						buildVariable('request'),
						buildIdentifier('get_param'),
						[buildArg(buildScalarString(key))]
					)
				)
			),
			[
				`${indent}$${variableName} = $request->get_param( '${escapeSingleQuotes(key)}' );`,
			]
		);
		options.body.statement(requestPrintable);

		const childIndentLevel = indentLevel + 1;
		const childIndent = PHP_INDENT.repeat(childIndentLevel);
		const innerStatements: PhpPrintable<PhpStmt>[] = [];

		if (descriptor?.single === false) {
			innerStatements.push(
				buildIfPrintable({
					indentLevel: childIndentLevel,
					condition: buildBooleanNot(
						buildFuncCall(buildName(['is_array']), [
							buildArg(buildVariable(variableName)),
						])
					),
					conditionText: `${childIndent}if ( ! is_array( $${variableName} ) ) {`,
					statements: [
						buildPrintable(
							buildExpressionStatement(
								buildAssign(
									buildVariable(variableName),
									buildArray([
										buildArrayItem(
											buildVariable(variableName)
										),
									])
								)
							),
							[
								`${childIndent}${PHP_INDENT}$${variableName} = [ $${variableName} ];`,
							]
						),
					],
				})
			);

			const normalisePrintable = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variableName),
						buildFuncCall(buildName(['array_values']), [
							buildArg(
								buildArrayCastNode(buildVariable(variableName))
							),
						])
					)
				),
				[
					`${childIndent}$${variableName} = array_values( (array) $${variableName} );`,
				]
			);

			const filterPrintable = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variableName),
						buildFuncCall(buildName(['array_filter']), [
							buildArg(buildVariable(variableName)),
							buildArg(createStaticTrimFilterClosure()),
						])
					)
				),
				[
					`${childIndent}$${variableName} = array_filter( $${variableName}, static fn ( $value ) => match ( trim( (string) $value ) ) {`,
					`${childIndent}${PHP_INDENT}'' => false,`,
					`${childIndent}${PHP_INDENT}default => true,`,
					`${childIndent}} );`,
				]
			);

			innerStatements.push(normalisePrintable, filterPrintable);

			const nestedIndent = PHP_INDENT.repeat(childIndentLevel + 1);
			const pushPrintable = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch('meta_query', null),
						buildArray([
							buildArrayItem(buildScalarString(key), {
								key: buildScalarString('key'),
							}),
							buildArrayItem(buildScalarString('IN'), {
								key: buildScalarString('compare'),
							}),
							buildArrayItem(buildVariable(variableName), {
								key: buildScalarString('value'),
							}),
						])
					)
				),
				[
					`${nestedIndent}$meta_query[] = [`,
					`${nestedIndent}${PHP_INDENT}'key' => '${escapeSingleQuotes(key)}',`,
					`${nestedIndent}${PHP_INDENT}'compare' => 'IN',`,
					`${nestedIndent}${PHP_INDENT}'value' => $${variableName},`,
					`${nestedIndent}];`,
				]
			);

			innerStatements.push(
				buildIfPrintable({
					indentLevel: childIndentLevel,
					condition: buildBinaryOperation(
						'Greater',
						buildFuncCall(buildName(['count']), [
							buildArg(buildVariable(variableName)),
						]),
						buildScalarInt(0)
					),
					conditionText: `${childIndent}if ( count( $${variableName} ) > 0 ) {`,
					statements: [pushPrintable],
				})
			);
		} else {
			const sanitisePrintable = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variableName),
						buildMatch(
							buildFuncCall(buildName(['is_scalar']), [
								buildArg(buildVariable(variableName)),
							]),
							[
								buildMatchArm(
									[buildScalarBool(true)],
									buildFuncCall(buildName(['trim']), [
										buildArg(
											buildScalarCast(
												'string',
												buildVariable(variableName)
											)
										),
									])
								),
								buildMatchArm(null, buildNull()),
							]
						)
					)
				),
				[
					`${childIndent}$${variableName} = match ( is_scalar( $${variableName} ) ) {`,
					`${childIndent}${PHP_INDENT}true => trim( (string) $${variableName} ),`,
					`${childIndent}${PHP_INDENT}default => null,`,
					`${childIndent}};`,
				]
			);

			const pushPrintable = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch('meta_query', null),
						buildArray([
							buildArrayItem(buildScalarString(key), {
								key: buildScalarString('key'),
							}),
							buildArrayItem(buildScalarString('='), {
								key: buildScalarString('compare'),
							}),
							buildArrayItem(buildVariable(variableName), {
								key: buildScalarString('value'),
							}),
						])
					)
				),
				[
					`${childIndent}${PHP_INDENT}$meta_query[] = [`,
					`${childIndent}${PHP_INDENT}${PHP_INDENT}'key' => '${escapeSingleQuotes(key)}',`,
					`${childIndent}${PHP_INDENT}${PHP_INDENT}'compare' => '=',`,
					`${childIndent}${PHP_INDENT}${PHP_INDENT}'value' => $${variableName},`,
					`${childIndent}${PHP_INDENT}];`,
				]
			);

			innerStatements.push(
				sanitisePrintable,
				buildIfPrintable({
					indentLevel: childIndentLevel,
					condition: buildBinaryOperation(
						'BooleanAnd',
						buildBinaryOperation(
							'NotIdentical',
							buildVariable(variableName),
							buildNull()
						),
						buildBinaryOperation(
							'NotIdentical',
							buildVariable(variableName),
							buildScalarString('')
						)
					),
					conditionText: `${childIndent}if ( null !== $${variableName} && '' !== $${variableName} ) {`,
					statements: [pushPrintable],
				})
			);
		}

		options.body.statement(
			buildIfPrintable({
				indentLevel,
				condition: buildBinaryOperation(
					'NotIdentical',
					buildVariable(variableName),
					buildNull()
				),
				conditionText: `${indent}if ( null !== $${variableName} ) {`,
				statements: innerStatements,
			})
		);
	}

	const assignPrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'query_args',
					buildScalarString('meta_query')
				),
				buildVariable('meta_query')
			)
		),
		[`${indent}${PHP_INDENT}$query_args['meta_query'] = $meta_query;`]
	);

	options.body.statement(
		buildIfPrintable({
			indentLevel,
			condition: buildBinaryOperation(
				'Greater',
				buildFuncCall(buildName(['count']), [
					buildArg(buildVariable('meta_query')),
				]),
				buildScalarInt(0)
			),
			conditionText: `${indent}if ( count( $meta_query ) > 0 ) {`,
			statements: [assignPrintable],
		})
	);
	options.body.blank();
}

function createStaticTrimFilterClosure(): PhpExpr {
	const parameter = buildParam(buildVariable('value'));
	const trimmedValue = buildFuncCall(buildName(['trim']), [
		buildArg(buildScalarCast('string', buildVariable('value'))),
	]);

	return buildArrowFunction({
		static: true,
		params: [parameter],
		expr: buildMatch(trimmedValue, [
			buildMatchArm([buildScalarString('')], buildScalarBool(false)),
			buildMatchArm(null, buildScalarBool(true)),
		]),
	});
}
