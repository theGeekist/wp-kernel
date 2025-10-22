import {
	createArg,
	createArray,
	createArrayItem,
	createArrayCast as createArrayCastNode,
	createAssign,
	createArrowFunction,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMatch,
	createMatchArm,
	createMethodCall,
	createName,
	createNull,
	createParam,
	createScalarBool,
	createScalarInt,
	createScalarString,
	createVariable,
	type PhpExpr,
	type PhpStmt,
} from '../../../ast/nodes';
import { createPrintable, type PhpPrintable } from '../../../ast/printables';
import { PHP_INDENT } from '../../../ast/templates';
import {
	buildArrayDimFetch,
	buildArrayInitialiser,
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildScalarCast,
} from '../utils';
import { escapeSingleQuotes, toSnakeCase } from '../../../ast/utils';
import type { PhpMethodBodyBuilder } from '../../../ast/templates';

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
		const requestPrintable = createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable(variableName),
					createMethodCall(
						createVariable('request'),
						createIdentifier('get_param'),
						[createArg(createScalarString(key))]
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
						createFuncCall(createName(['is_array']), [
							createArg(createVariable(variableName)),
						])
					),
					conditionText: `${childIndent}if ( ! is_array( $${variableName} ) ) {`,
					statements: [
						createPrintable(
							createExpressionStatement(
								createAssign(
									createVariable(variableName),
									createArray([
										createArrayItem(
											createVariable(variableName)
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

			const normalisePrintable = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable(variableName),
						createFuncCall(createName(['array_values']), [
							createArg(
								createArrayCastNode(
									createVariable(variableName)
								)
							),
						])
					)
				),
				[
					`${childIndent}$${variableName} = array_values( (array) $${variableName} );`,
				]
			);

			const filterPrintable = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable(variableName),
						createFuncCall(createName(['array_filter']), [
							createArg(createVariable(variableName)),
							createArg(createStaticTrimFilterClosure()),
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
			const pushPrintable = createPrintable(
				createExpressionStatement(
					createAssign(
						buildArrayDimFetch('meta_query', null),
						createArray([
							createArrayItem(createScalarString(key), {
								key: createScalarString('key'),
							}),
							createArrayItem(createScalarString('IN'), {
								key: createScalarString('compare'),
							}),
							createArrayItem(createVariable(variableName), {
								key: createScalarString('value'),
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
						createFuncCall(createName(['count']), [
							createArg(createVariable(variableName)),
						]),
						createScalarInt(0)
					),
					conditionText: `${childIndent}if ( count( $${variableName} ) > 0 ) {`,
					statements: [pushPrintable],
				})
			);
		} else {
			const sanitisePrintable = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable(variableName),
						createMatch(
							createFuncCall(createName(['is_scalar']), [
								createArg(createVariable(variableName)),
							]),
							[
								createMatchArm(
									[createScalarBool(true)],
									createFuncCall(createName(['trim']), [
										createArg(
											buildScalarCast(
												'string',
												createVariable(variableName)
											)
										),
									])
								),
								createMatchArm(null, createNull()),
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

			const pushPrintable = createPrintable(
				createExpressionStatement(
					createAssign(
						buildArrayDimFetch('meta_query', null),
						createArray([
							createArrayItem(createScalarString(key), {
								key: createScalarString('key'),
							}),
							createArrayItem(createScalarString('='), {
								key: createScalarString('compare'),
							}),
							createArrayItem(createVariable(variableName), {
								key: createScalarString('value'),
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
							createVariable(variableName),
							createNull()
						),
						buildBinaryOperation(
							'NotIdentical',
							createVariable(variableName),
							createScalarString('')
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
					createVariable(variableName),
					createNull()
				),
				conditionText: `${indent}if ( null !== $${variableName} ) {`,
				statements: innerStatements,
			})
		);
	}

	const assignPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch(
					'query_args',
					createScalarString('meta_query')
				),
				createVariable('meta_query')
			)
		),
		[`${indent}${PHP_INDENT}$query_args['meta_query'] = $meta_query;`]
	);

	options.body.statement(
		buildIfPrintable({
			indentLevel,
			condition: buildBinaryOperation(
				'Greater',
				createFuncCall(createName(['count']), [
					createArg(createVariable('meta_query')),
				]),
				createScalarInt(0)
			),
			conditionText: `${indent}if ( count( $meta_query ) > 0 ) {`,
			statements: [assignPrintable],
		})
	);
	options.body.blank();
}

function createStaticTrimFilterClosure(): PhpExpr {
	const parameter = createParam(createVariable('value'));
	const trimmedValue = createFuncCall(createName(['trim']), [
		createArg(buildScalarCast('string', createVariable('value'))),
	]);

	return createArrowFunction({
		static: true,
		params: [parameter],
		expr: createMatch(trimmedValue, [
			createMatchArm([createScalarString('')], createScalarBool(false)),
			createMatchArm(null, createScalarBool(true)),
		]),
	});
}
