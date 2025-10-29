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

export interface IdentityResolutionSource {
	readonly identity?: ResourceIdentityConfig | null;
}

export interface ResolvedIdentity {
	readonly type: 'number' | 'string';
	readonly param: string;
}

export interface IdentityGuardOptions {
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

export interface IdentityHelpers {
	readonly resolveIdentityConfig: (
		resource: IdentityResolutionSource
	) => ResolvedIdentity;
	readonly buildIdentityGuardStatements: (
		options: IdentityGuardOptions
	) => readonly PhpStmt[];
}

export function buildIdentityHelpers(): IdentityHelpers {
	return {
		resolveIdentityConfig: resolveIdentityConfigInternal,
		buildIdentityGuardStatements,
	};
}

export function resolveIdentityConfig(
	resource: IdentityResolutionSource
): ResolvedIdentity {
	return resolveIdentityConfigInternal(resource);
}

export function buildIdentityGuardStatements(
	options: IdentityGuardOptions
): readonly PhpStmt[] {
	const variable = normaliseVariableReference(options.identity.param);

	return identityGuardBuilders[options.identity.type](options, variable.raw);
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
	options: IdentityGuardOptions,
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
	options: IdentityGuardOptions,
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

const DEFAULT_IDENTITY: ResolvedIdentity = {
	type: 'number',
	param: 'id',
};

const DEFAULT_IDENTITY_PARAM: Record<IdentityType, string> = {
	number: 'id',
	string: 'slug',
};

type IdentityGuardBuilder = (
	options: IdentityGuardOptions,
	variable: string
) => readonly PhpStmt[];

const identityGuardBuilders: Record<IdentityType, IdentityGuardBuilder> = {
	number: buildNumericIdentityGuards,
	string: buildStringIdentityGuards,
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
