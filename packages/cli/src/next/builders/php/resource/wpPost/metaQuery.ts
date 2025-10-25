import {
	buildArg,
	buildArray,
	buildArrayCast as buildArrayCastNode,
	buildArrayItem,
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
	type PhpStmtExpression,
	type PhpStmtIf,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildBooleanNot,
	buildScalarCast,
	buildIfStatementNode,
	buildArrayInitialiserStatement,
} from '../utils';
import { toSnakeCase } from '../../utils';

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

export interface BuildMetaQueryStatementsOptions {
	readonly entries: Array<[string, { single?: boolean | null } | undefined]>;
}

export function buildMetaQueryStatements(
	options: BuildMetaQueryStatementsOptions
): readonly PhpStmt[] {
	if (options.entries.length === 0) {
		return [];
	}

	const statements: PhpStmt[] = [
		buildArrayInitialiserStatement({ variable: 'meta_query' }),
	];

	for (const [key, descriptor] of options.entries) {
		const variableName = `${toSnakeCase(key)}Meta`;
		statements.push(createMetaRequestAssignment(variableName, key));
		statements.push(
			buildIfStatementNode({
				condition: buildBinaryOperation(
					'NotIdentical',
					buildVariable(variableName),
					buildNull()
				),
				statements: createMetaBranchStatements({
					key,
					variableName,
					descriptor,
				}),
			})
		);
	}

	statements.push(createMetaQueryAssignmentGuard());

	return statements;
}

interface MetaBranchOptions {
	readonly key: string;
	readonly variableName: string;
	readonly descriptor: { single?: boolean | null } | undefined;
}

function createMetaBranchStatements(
	options: MetaBranchOptions
): readonly PhpStmt[] {
	const { key, variableName, descriptor } = options;

	if (descriptor?.single === false) {
		return createMultiValueMetaStatements({ key, variableName });
	}

	return createSingleValueMetaStatements({ key, variableName });
}

interface MetaStatementBaseOptions {
	readonly key: string;
	readonly variableName: string;
}

function createMultiValueMetaStatements(
	options: MetaStatementBaseOptions
): readonly PhpStmt[] {
	const ensureArray = buildIfStatementNode({
		condition: buildBooleanNot(
			buildFuncCall(buildName(['is_array']), [
				buildArg(buildVariable(options.variableName)),
			])
		),
		statements: [
			buildExpressionStatement(
				buildAssign(
					buildVariable(options.variableName),
					buildArray([
						buildArrayItem(buildVariable(options.variableName)),
					])
				)
			),
		],
	});

	const normalise = buildExpressionStatement(
		buildAssign(
			buildVariable(options.variableName),
			buildFuncCall(buildName(['array_values']), [
				buildArg(
					buildArrayCastNode(buildVariable(options.variableName))
				),
			])
		)
	);

	const filter = buildExpressionStatement(
		buildAssign(
			buildVariable(options.variableName),
			buildFuncCall(buildName(['array_filter']), [
				buildArg(buildVariable(options.variableName)),
				buildArg(createStaticTrimFilterClosure()),
			])
		)
	);

	const push = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('meta_query', null),
			buildArray([
				buildArrayItem(buildScalarString(options.key), {
					key: buildScalarString('key'),
				}),
				buildArrayItem(buildScalarString('IN'), {
					key: buildScalarString('compare'),
				}),
				buildArrayItem(buildVariable(options.variableName), {
					key: buildScalarString('value'),
				}),
			])
		)
	);

	const ensureNonEmpty = buildIfStatementNode({
		condition: buildBinaryOperation(
			'Greater',
			buildFuncCall(buildName(['count']), [
				buildArg(buildVariable(options.variableName)),
			]),
			buildScalarInt(0)
		),
		statements: [push],
	});

	return [ensureArray, normalise, filter, ensureNonEmpty];
}

function createSingleValueMetaStatements(
	options: MetaStatementBaseOptions
): readonly PhpStmt[] {
	const sanitise = buildExpressionStatement(
		buildAssign(
			buildVariable(options.variableName),
			buildMatch(
				buildFuncCall(buildName(['is_scalar']), [
					buildArg(buildVariable(options.variableName)),
				]),
				[
					buildMatchArm(
						[buildScalarBool(true)],
						buildFuncCall(buildName(['trim']), [
							buildArg(
								buildScalarCast(
									'string',
									buildVariable(options.variableName)
								)
							),
						])
					),
					buildMatchArm(null, buildNull()),
				]
			)
		)
	);

	const push = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('meta_query', null),
			buildArray([
				buildArrayItem(buildScalarString(options.key), {
					key: buildScalarString('key'),
				}),
				buildArrayItem(buildScalarString('='), {
					key: buildScalarString('compare'),
				}),
				buildArrayItem(buildVariable(options.variableName), {
					key: buildScalarString('value'),
				}),
			])
		)
	);

	const nonEmptyGuard = buildIfStatementNode({
		condition: buildBinaryOperation(
			'BooleanAnd',
			buildBinaryOperation(
				'NotIdentical',
				buildVariable(options.variableName),
				buildNull()
			),
			buildBinaryOperation(
				'NotIdentical',
				buildVariable(options.variableName),
				buildScalarString('')
			)
		),
		statements: [push],
	});

	return [sanitise, nonEmptyGuard];
}

function createMetaRequestAssignment(
	variableName: string,
	key: string
): PhpStmtExpression {
	return buildExpressionStatement(
		buildAssign(
			buildVariable(variableName),
			buildMethodCall(
				buildVariable('request'),
				buildIdentifier('get_param'),
				[buildArg(buildScalarString(key))]
			)
		)
	);
}

function createMetaQueryAssignmentGuard(): PhpStmtIf {
	return buildIfStatementNode({
		condition: buildBinaryOperation(
			'Greater',
			buildFuncCall(buildName(['count']), [
				buildArg(buildVariable('meta_query')),
			]),
			buildScalarInt(0)
		),
		statements: [
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch(
						'query_args',
						buildScalarString('meta_query')
					),
					buildVariable('meta_query')
				)
			),
		],
	});
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
