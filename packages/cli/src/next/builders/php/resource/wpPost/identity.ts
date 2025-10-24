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
import type { ResolvedIdentity } from '../../identity';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildScalarCast,
	normaliseVariableReference,
} from '../utils';
import { buildWpErrorReturn } from '../errors';

export interface IdentityValidationOptions {
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

export function buildIdentityValidationStatements(
	options: IdentityValidationOptions
): PhpStmt[] {
	const { identity, pascalName, errorCodeFactory } = options;
	const variable = normaliseVariableReference(identity.param);
	const statements: PhpStmt[] = [];

	if (identity.type === 'number') {
		const missingReturn = buildWpErrorReturn({
			code: errorCodeFactory('missing_identifier'),
			message: `Missing identifier for ${pascalName}.`,
			status: 400,
		});
		statements.push(
			buildIfStatement(
				buildBinaryOperation(
					'Identical',
					buildNull(),
					buildVariable(variable.raw)
				),
				[missingReturn]
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variable.raw),
					buildScalarCast('int', buildVariable(variable.raw))
				)
			)
		);

		const invalidReturn = buildWpErrorReturn({
			code: errorCodeFactory('invalid_identifier'),
			message: `Invalid identifier for ${pascalName}.`,
			status: 400,
		});
		statements.push(
			buildIfStatement(
				buildBinaryOperation(
					'SmallerOrEqual',
					buildVariable(variable.raw),
					buildScalarInt(0)
				),
				[invalidReturn]
			)
		);

		return statements;
	}

	const missingReturn = buildWpErrorReturn({
		code: errorCodeFactory('missing_identifier'),
		message: `Missing identifier for ${pascalName}.`,
		status: 400,
	});

	const condition = buildBinaryOperation(
		'BooleanOr',
		buildBooleanNot(
			buildFuncCall(buildName(['is_string']), [
				buildArg(buildVariable(variable.raw)),
			])
		),
		buildBinaryOperation(
			'Identical',
			buildScalarString(''),
			buildFuncCall(buildName(['trim']), [
				buildArg(buildVariable(variable.raw)),
			])
		)
	);

	statements.push(buildIfStatement(condition, [missingReturn]));

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable(variable.raw),
				buildFuncCall(buildName(['trim']), [
					buildArg(
						buildScalarCast('string', buildVariable(variable.raw))
					),
				])
			)
		)
	);

	return statements;
}
