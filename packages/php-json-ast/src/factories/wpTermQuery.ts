import { KernelError } from '../KernelError';
import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildName,
	buildNode,
	buildVariable,
	type PhpExprNew,
	type PhpStmtExpression,
} from '../nodes';
import { buildPrintable, type PhpPrintable } from '../printables';

const DEFAULT_INDENT_UNIT = '        ';

export interface BuildWpTermQueryInstantiationOptions {
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

export function buildWpTermQueryInstantiation(
	options: BuildWpTermQueryInstantiationOptions
): PhpPrintable<PhpStmtExpression> {
	const indentUnit = options.indentUnit ?? DEFAULT_INDENT_UNIT;
	const indentLevel = options.indentLevel ?? 0;
	const indent = indentUnit.repeat(indentLevel);
	const target = normaliseVariableName(options.target);

	const args = options.argsVariable
		? normaliseVariableName(options.argsVariable)
		: undefined;

	const instantiation = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Term_Query']),
		args: args ? [buildArg(buildVariable(args.raw))] : [],
	});

	const expression = buildExpressionStatement(
		buildAssign(buildVariable(target.raw), instantiation)
	);

	const line = args
		? `${indent}${target.display} = new WP_Term_Query( ${args.display} );`
		: `${indent}${target.display} = new WP_Term_Query();`;

	return buildPrintable(expression, [line]);
}
