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
} from '@wpkernel/php-json-ast';

/**
 * Options for building a `WP_Term_Query` instantiation.
 *
 * @category WordPress AST
 * @example
 * ```ts
 * const options: BuildWpTermQueryInstantiationOptions = {
 * 	target: '$query',
 * 	argsVariable: '$args',
 * };
 * ```
 */
export interface BuildWpTermQueryInstantiationOptions {
	/**
	 * The name of the variable to which the `WP_Term_Query` instance will be assigned.
	 */
	readonly target: string;
	/**
	 * The name of the variable containing the query arguments.
	 */
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

/**
 * Builds a PHP AST statement that instantiates a `WP_Term_Query`.
 *
 * @param    options - The options for building the instantiation.
 * @returns A PHP AST expression statement.
 * @category WordPress AST
 * @example
 * ```ts
 * import { buildWpTermQueryInstantiation } from '@wpkernel/wp-json-ast';
 *
 * const statement = buildWpTermQueryInstantiation({
 * 	target: '$query',
 * 	argsVariable: '$args',
 * });
 *
 * // $query = new WP_Term_Query($args);
 * ```
 */
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
