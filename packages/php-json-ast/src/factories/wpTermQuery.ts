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

export interface BuildWpTermQueryInstantiationOptions {
	readonly target: string;
	readonly argsVariable?: string;
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

export function buildWpTermQueryInstantiation(
	options: BuildWpTermQueryInstantiationOptions
): PhpStmtExpression {
	const target = normaliseVariableName(options.target);

	const args = options.argsVariable
		? normaliseVariableName(options.argsVariable)
		: undefined;

	const instantiation = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Term_Query']),
		args: args ? [buildArg(buildVariable(args.raw))] : [],
	});

	return buildExpressionStatement(
		buildAssign(buildVariable(target.raw), instantiation)
	);
}
