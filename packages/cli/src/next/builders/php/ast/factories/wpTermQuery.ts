import { KernelError } from '@wpkernel/core/contracts';
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

export interface CreateWpTermQueryInstantiationOptions {
	readonly target: string;
	readonly argsVariable?: string;
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

export function createWpTermQueryInstantiation(
	options: CreateWpTermQueryInstantiationOptions
): PhpPrintable<PhpStmtExpression> {
	const indentUnit = options.indentUnit ?? DEFAULT_INDENT_UNIT;
	const indentLevel = options.indentLevel ?? 0;
	const indent = indentUnit.repeat(indentLevel);
	const target = normaliseVariableName(options.target);

	const args = options.argsVariable
		? normaliseVariableName(options.argsVariable)
		: undefined;

	const instantiation = createNode<PhpExprNew>('Expr_New', {
		class: createName(['WP_Term_Query']),
		args: args ? [createArg(createVariable(args.raw))] : [],
	});

	const expression = createExpressionStatement(
		createAssign(createVariable(target.raw), instantiation)
	);

	const line = args
		? `${indent}${target.display} = new WP_Term_Query( ${args.display} );`
		: `${indent}${target.display} = new WP_Term_Query();`;

	return createPrintable(expression, [line]);
}
