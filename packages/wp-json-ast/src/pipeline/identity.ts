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

	if (options.identity.type === 'number') {
		return buildNumericIdentityGuards(options, variable.raw);
	}

	return buildStringIdentityGuards(options, variable.raw);
}

function resolveIdentityConfigInternal(
	resource: IdentityResolutionSource
): ResolvedIdentity {
	const identity = resource.identity;
	if (!identity) {
		return {
			type: 'number',
			param: 'id',
		};
	}

	const param =
		identity.param ?? (identity.type === 'number' ? 'id' : 'slug');

	return {
		type: identity.type,
		param,
	};
}

function buildNumericIdentityGuards(
	options: IdentityGuardOptions,
	variable: string
): readonly PhpStmt[] {
	const missingIdentifier = buildWpErrorReturn({
		code: options.errorCodeFactory('missing_identifier'),
		message: `Missing identifier for ${options.pascalName}.`,
		status: 400,
	});

	const invalidIdentifier = buildWpErrorReturn({
		code: options.errorCodeFactory('invalid_identifier'),
		message: `Invalid identifier for ${options.pascalName}.`,
		status: 400,
	});

	return [
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildNull(),
				buildVariable(variable)
			),
			[missingIdentifier]
		),
		buildExpressionStatement(
			buildAssign(
				buildVariable(variable),
				buildScalarCast('int', buildVariable(variable))
			)
		),
		buildIfStatement(
			buildBinaryOperation(
				'SmallerOrEqual',
				buildVariable(variable),
				buildScalarInt(0)
			),
			[invalidIdentifier]
		),
	];
}

function buildStringIdentityGuards(
	options: IdentityGuardOptions,
	variable: string
): readonly PhpStmt[] {
	const missingIdentifier = buildWpErrorReturn({
		code: options.errorCodeFactory('missing_identifier'),
		message: `Missing identifier for ${options.pascalName}.`,
		status: 400,
	});

	const guardCondition = buildBinaryOperation(
		'BooleanOr',
		buildBooleanNot(
			buildFuncCall(buildName(['is_string']), [
				buildArg(buildVariable(variable)),
			])
		),
		buildBinaryOperation(
			'Identical',
			buildScalarString(''),
			buildFuncCall(buildName(['trim']), [
				buildArg(buildVariable(variable)),
			])
		)
	);

	return [
		buildIfStatement(guardCondition, [missingIdentifier]),
		buildExpressionStatement(
			buildAssign(
				buildVariable(variable),
				buildFuncCall(buildName(['trim']), [
					buildArg(
						buildScalarCast('string', buildVariable(variable))
					),
				])
			)
		),
	];
}
