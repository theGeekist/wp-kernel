import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIfStatement,
	buildName,
	buildNull,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { ResourceIdentityConfig } from '@wpkernel/core/resource';

import {
	buildBinaryOperation,
	buildBooleanNot,
	buildScalarCast,
	normaliseVariableReference,
} from '../resource/common/utils';
import { buildWpErrorReturn } from '../resource/errors';

/**
 * @category WordPress AST
 */
export interface IdentityResolutionSource {
	readonly identity?: ResourceIdentityConfig | null;
}

/**
 * @category WordPress AST
 */
export interface ResolvedNumberIdentity {
	readonly type: 'number';
	readonly param: string;
}

/**
 * @category WordPress AST
 */
export interface ResolvedStringIdentity {
	readonly type: 'string';
	readonly param: string;
}

/**
 * @category WordPress AST
 */
export type ResolvedIdentity = ResolvedNumberIdentity | ResolvedStringIdentity;

/**
 * @category WordPress AST
 */
export interface BaseIdentityGuardOptions {
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

/**
 * @category WordPress AST
 */
export interface NumericIdentityGuardOptions extends BaseIdentityGuardOptions {
	readonly identity: ResolvedNumberIdentity;
}

/**
 * @category WordPress AST
 */
export interface StringIdentityGuardOptions extends BaseIdentityGuardOptions {
	readonly identity: ResolvedStringIdentity;
}

/**
 * @category WordPress AST
 */
export type IdentityGuardOptions =
	| NumericIdentityGuardOptions
	| StringIdentityGuardOptions;

/**
 * @category WordPress AST
 */
export interface IdentityHelpers {
	readonly resolveIdentityConfig: (
		resource: IdentityResolutionSource
	) => ResolvedIdentity;
	readonly buildIdentityGuardStatements: (
		options: IdentityGuardOptions
	) => readonly PhpStmt[];
}

/**
 * @category WordPress AST
 */
export function buildIdentityHelpers(): IdentityHelpers {
	return {
		resolveIdentityConfig: resolveIdentityConfigInternal,
		buildIdentityGuardStatements,
	};
}

/**
 * @param    resource
 * @category WordPress AST
 */
export function resolveIdentityConfig(
	resource: IdentityResolutionSource
): ResolvedIdentity {
	return resolveIdentityConfigInternal(resource);
}

/**
 * @param    identity
 * @category WordPress AST
 */
export function isNumericIdentity(
	identity: ResolvedIdentity
): identity is ResolvedNumberIdentity {
	return identity.type === 'number';
}

/**
 * @param    identity
 * @category WordPress AST
 */
export function isStringIdentity(
	identity: ResolvedIdentity
): identity is ResolvedStringIdentity {
	return identity.type === 'string';
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildIdentityGuardStatements(
	options: IdentityGuardOptions
): readonly PhpStmt[] {
	const variable = normaliseVariableReference(options.identity.param);

	if (isNumericIdentity(options.identity)) {
		const numericOptions: NumericIdentityGuardOptions = {
			...options,
			identity: options.identity,
		};

		return buildNumericIdentityGuards(numericOptions, variable.raw);
	}

	const stringOptions: StringIdentityGuardOptions = {
		...options,
		identity: options.identity,
	};

	return buildStringIdentityGuards(stringOptions, variable.raw);
}

function resolveIdentityConfigInternal(
	resource: IdentityResolutionSource
): ResolvedIdentity {
	const identity = resource.identity;
	if (!identity) {
		return { ...DEFAULT_IDENTITY };
	}

	const { type, param } = identity;

	return {
		type,
		param: param ?? DEFAULT_IDENTITY_PARAM[type],
	};
}

function buildNumericIdentityGuards(
	options: NumericIdentityGuardOptions,
	variable: string
): readonly PhpStmt[] {
	const createVariable = () => buildVariable(variable);

	return [
		buildIfStatement(
			buildBinaryOperation('Identical', buildNull(), createVariable()),
			[createIdentityGuardError(options, 'missing')]
		),
		buildExpressionStatement(
			buildAssign(
				createVariable(),
				buildScalarCast('int', createVariable())
			)
		),
		buildIfStatement(
			buildBinaryOperation(
				'SmallerOrEqual',
				createVariable(),
				buildScalarInt(0)
			),
			[createIdentityGuardError(options, 'invalid')]
		),
	];
}

function buildStringIdentityGuards(
	options: StringIdentityGuardOptions,
	variable: string
): readonly PhpStmt[] {
	const createVariable = () => buildVariable(variable);
	const buildTrimCall = (argument: PhpExpr) =>
		buildFuncCall(buildName(['trim']), [buildArg(argument)]);

	const guardCondition = buildBinaryOperation(
		'BooleanOr',
		buildBooleanNot(
			buildFuncCall(buildName(['is_string']), [
				buildArg(createVariable()),
			])
		),
		buildBinaryOperation(
			'Identical',
			buildScalarString(''),
			buildTrimCall(createVariable())
		)
	);

	return [
		buildIfStatement(guardCondition, [
			createIdentityGuardError(options, 'missing'),
		]),
		buildExpressionStatement(
			buildAssign(
				createVariable(),
				buildTrimCall(buildScalarCast('string', createVariable()))
			)
		),
	];
}

type IdentityType = ResolvedIdentity['type'];

const DEFAULT_IDENTITY: ResolvedNumberIdentity = {
	type: 'number',
	param: 'id',
};

const DEFAULT_IDENTITY_PARAM: Record<IdentityType, string> = {
	number: 'id',
	string: 'slug',
};

type IdentityErrorKind = 'missing' | 'invalid';

function createIdentityGuardError(
	options: IdentityGuardOptions,
	kind: IdentityErrorKind
): PhpStmt {
	const suffix =
		kind === 'missing' ? 'missing_identifier' : 'invalid_identifier';
	const adjective = kind === 'missing' ? 'Missing' : 'Invalid';

	return buildWpErrorReturn({
		code: options.errorCodeFactory(suffix),
		message: `${adjective} identifier for ${options.pascalName}.`,
		status: 400,
	});
}
