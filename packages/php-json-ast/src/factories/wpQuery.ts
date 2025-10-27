import { WPKernelError } from '@wpkernel/core/contracts';
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

export interface BuildWpQueryInstantiationOptions {
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
		throw new WPKernelError('DeveloperError', {
			message: 'Variable name must not be empty.',
			context: { name },
		});
	}

	if (trimmed.startsWith('$')) {
		const raw = trimmed.slice(1);
		if (!raw) {
			throw new WPKernelError('DeveloperError', {
				message: 'Variable name must include an identifier.',
				context: { name },
			});
		}
		return { raw, display: trimmed };
	}

	return { raw: trimmed, display: `$${trimmed}` };
}

export function buildWpQueryInstantiation(
	options: BuildWpQueryInstantiationOptions
): PhpPrintable<PhpStmtExpression> {
	const indentUnit = options.indentUnit ?? DEFAULT_INDENT_UNIT;
	const indentLevel = options.indentLevel ?? 0;
	const indent = indentUnit.repeat(indentLevel);
	const target = normaliseVariableName(options.target);
	const args = normaliseVariableName(options.argsVariable);

	const expression = buildExpressionStatement(
		buildAssign(
			buildVariable(target.raw),
			buildNode<PhpExprNew>('Expr_New', {
				class: buildName(['WP_Query']),
				args: [buildArg(buildVariable(args.raw))],
			})
		)
	);

	const line = `${indent}${target.display} = new WP_Query( ${args.display} );`;

	return buildPrintable(expression, [line]);
}
