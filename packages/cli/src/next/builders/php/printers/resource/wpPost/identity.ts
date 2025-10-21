import {
	createArg,
	createAssign,
	createExpressionStatement,
	createFuncCall,
	createName,
	createNull,
	createScalarInt,
	createScalarString,
	createVariable,
	type PhpStmt,
} from '../../../ast/nodes';
import { createPrintable, type PhpPrintable } from '../../../ast/printables';
import { PHP_INDENT } from '../../../ast/templates';
import type { ResolvedIdentity } from '../../identity';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildScalarCast,
	normaliseVariableReference,
} from '../utils';
import { createWpErrorReturn } from '../errors';

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
	const indent = PHP_INDENT.repeat(indentLevel);
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
					createNull(),
					createVariable(variable.raw)
				),
				conditionText: `${indent}if ( null === ${variable.display} ) {`,
				statements: [missingReturn],
			})
		);

		statements.push(
			createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable(variable.raw),
						buildScalarCast('int', createVariable(variable.raw))
					)
				),
				[`${indent}${variable.display} = (int) ${variable.display};`]
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
					createVariable(variable.raw),
					createScalarInt(0)
				),
				conditionText: `${indent}if ( ${variable.display} <= 0 ) {`,
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
			createFuncCall(createName(['is_string']), [
				createArg(createVariable(variable.raw)),
			])
		),
		buildBinaryOperation(
			'Identical',
			createScalarString(''),
			createFuncCall(createName(['trim']), [
				createArg(createVariable(variable.raw)),
			])
		)
	);

	statements.push(
		buildIfPrintable({
			indentLevel,
			condition,
			conditionText: `${indent}if ( ! is_string( ${variable.display} ) || '' === trim( ${variable.display} ) ) {`,
			statements: [missingReturn],
		})
	);

	statements.push(
		createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable(variable.raw),
					createFuncCall(createName(['trim']), [
						createArg(
							buildScalarCast(
								'string',
								createVariable(variable.raw)
							)
						),
					])
				)
			),
			[
				`${indent}${variable.display} = trim( (string) ${variable.display} );`,
			]
		)
	);

	return statements;
}
