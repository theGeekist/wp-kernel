import { KernelError } from '../KernelError';
import {
	createArg,
	createAssign,
	createExpressionStatement,
	createName,
	createNode,
	createVariable,
	type PhpExprNew,
	type PhpStmtExpression,
} from '../nodes';
import { createPrintable, type PhpPrintable } from '../printables';

const DEFAULT_INDENT_UNIT = '        ';

export interface CreateWpQueryInstantiationOptions {
	readonly target: string;
	readonly argsVariable: string;
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

interface NormalisedVariableName {
	readonly raw: string;
	readonly display: string;
}

function normaliseVariableName(name: string): NormalisedVariableName {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new KernelError('DeveloperError', {
			message: 'Variable name must not be empty.',
			context: { name },
		});
	}

	if (trimmed.startsWith('$')) {
		const raw = trimmed.slice(1);
		if (!raw) {
			throw new KernelError('DeveloperError', {
				message: 'Variable name must include an identifier.',
				context: { name },
			});
		}
		return { raw, display: trimmed };
	}

	return { raw: trimmed, display: `$${trimmed}` };
}

export function createWpQueryInstantiation(
	options: CreateWpQueryInstantiationOptions
): PhpPrintable<PhpStmtExpression> {
	const indentUnit = options.indentUnit ?? DEFAULT_INDENT_UNIT;
	const indentLevel = options.indentLevel ?? 0;
	const indent = indentUnit.repeat(indentLevel);
	const target = normaliseVariableName(options.target);
	const args = normaliseVariableName(options.argsVariable);

	const expression = createExpressionStatement(
		createAssign(
			createVariable(target.raw),
			createNode<PhpExprNew>('Expr_New', {
				class: createName(['WP_Query']),
				args: [createArg(createVariable(args.raw))],
			})
		)
	);

	const line = `${indent}${target.display} = new WP_Query( ${args.display} );`;

	return createPrintable(expression, [line]);
}
