import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildName,
	buildNull,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpStmt,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast';
import type { ResolvedIdentity } from '../../identity';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildScalarCast,
	normaliseVariableReference,
} from '../utils';
import { buildIfPrintable } from '../printable';
import { createWpErrorReturn } from '../errors';
import { formatStatementPrintable } from '../printer';

export interface IdentityValidationOptions {
	readonly identity: ResolvedIdentity;
	readonly indentLevel: number;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

export function createIdentityValidationPrintables(
	options: IdentityValidationOptions
): PhpPrintable<PhpStmt>[] {
	const { identity, indentLevel, pascalName, errorCodeFactory } = options;
	const variable = normaliseVariableReference(identity.param);
	const statements: PhpPrintable<PhpStmt>[] = [];

	if (identity.type === 'number') {
		const missingReturn = createWpErrorReturn({
			indentLevel: indentLevel + 1,
			code: errorCodeFactory('missing_identifier'),
			message: `Missing identifier for ${pascalName}.`,
			status: 400,
		});
		statements.push(
			buildIfPrintable({
				indentLevel,
				condition: buildBinaryOperation(
					'Identical',
					buildNull(),
					buildVariable(variable.raw)
				),
				statements: [missingReturn],
			})
		);

		statements.push(
			formatStatementPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variable.raw),
						buildScalarCast('int', buildVariable(variable.raw))
					)
				),
				{
					indentLevel,
					indentUnit: PHP_INDENT,
				}
			)
		);

		const invalidReturn = createWpErrorReturn({
			indentLevel: indentLevel + 1,
			code: errorCodeFactory('invalid_identifier'),
			message: `Invalid identifier for ${pascalName}.`,
			status: 400,
		});
		statements.push(
			buildIfPrintable({
				indentLevel,
				condition: buildBinaryOperation(
					'SmallerOrEqual',
					buildVariable(variable.raw),
					buildScalarInt(0)
				),
				statements: [invalidReturn],
			})
		);

		return statements;
	}

	const missingReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
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

	statements.push(
		buildIfPrintable({
			indentLevel,
			condition,
			statements: [missingReturn],
		})
	);

	statements.push(
		formatStatementPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variable.raw),
					buildFuncCall(buildName(['trim']), [
						buildArg(
							buildScalarCast(
								'string',
								buildVariable(variable.raw)
							)
						),
					])
				)
			),
			{
				indentLevel,
				indentUnit: PHP_INDENT,
			}
		)
	);

	return statements;
}
