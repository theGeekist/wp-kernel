import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	buildTernary,
	buildNull,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import {
	buildBinaryOperation,
	buildFunctionCall,
	buildFunctionCallAssignmentStatement,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../../common/utils';
import { buildWpErrorReturn } from '../../errors';

export interface BuildWpOptionRouteBaseOptions {
	readonly pascalName: string;
	readonly optionName: string;
}

export interface BuildWpOptionUnsupportedRouteOptions
	extends BuildWpOptionRouteBaseOptions {
	readonly errorCodeFactory: (suffix: string) => string;
}

export function buildWpOptionGetRouteStatements(
	options: BuildWpOptionRouteBaseOptions
): PhpStmt[] {
	const optionVar = normaliseVariableReference('option_name');
	const valueVar = normaliseVariableReference('value');

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'option_name',
			subject: 'this',
			method: `get${options.pascalName}OptionName`,
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: 'value',
			functionName: 'get_option',
			args: [buildArg(buildVariable(optionVar.raw))],
		})
	);

	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable(optionVar.raw), {
					key: buildScalarString('option'),
				}),
				buildArrayItem(buildVariable(valueVar.raw), {
					key: buildScalarString('value'),
				}),
			])
		)
	);

	return statements;
}

export function buildWpOptionUpdateRouteStatements(
	options: BuildWpOptionRouteBaseOptions
): PhpStmt[] {
	const optionVar = normaliseVariableReference('option_name');
	const previousVar = normaliseVariableReference('previous');
	const valueVar = normaliseVariableReference('value');
	const autoloadVar = normaliseVariableReference('autoload');
	const updatedVar = normaliseVariableReference('updated');
	const valueAfterVar = normaliseVariableReference('value_after');

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'option_name',
			subject: 'this',
			method: `get${options.pascalName}OptionName`,
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: 'previous',
			functionName: 'get_option',
			args: [buildArg(buildVariable(optionVar.raw))],
		})
	);

	statements.push(
		buildVariableAssignment(
			valueVar,
			buildMethodCallExpression({
				subject: 'request',
				method: 'get_param',
				args: [buildArg(buildScalarString('value'))],
			})
		)
	);

	statements.push(
		buildVariableAssignment(
			autoloadVar,
			buildMethodCallExpression({
				subject: 'this',
				method: `normalise${options.pascalName}Autoload`,
				args: [
					buildArg(
						buildMethodCallExpression({
							subject: 'request',
							method: 'get_param',
							args: [buildArg(buildScalarString('autoload'))],
						})
					),
				],
			})
		)
	);

	statements.push(buildStmtNop());

	const updateWithAutoload = buildFunctionCall('update_option', [
		buildArg(buildVariable(optionVar.raw)),
		buildArg(buildVariable(valueVar.raw)),
		buildArg(buildVariable(autoloadVar.raw)),
	]);
	const updateWithoutAutoload = buildFunctionCall('update_option', [
		buildArg(buildVariable(optionVar.raw)),
		buildArg(buildVariable(valueVar.raw)),
	]);

	statements.push(
		buildVariableAssignment(
			updatedVar,
			buildTernary(
				buildBinaryOperation(
					'NotIdentical',
					buildNull(),
					buildVariable(autoloadVar.raw)
				),
				updateWithAutoload,
				updateWithoutAutoload
			)
		)
	);

	statements.push(buildStmtNop());

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: 'value_after',
			functionName: 'get_option',
			args: [buildArg(buildVariable(optionVar.raw))],
		})
	);

	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable(optionVar.raw), {
					key: buildScalarString('option'),
				}),
				buildArrayItem(
					buildScalarCast('bool', buildVariable(updatedVar.raw)),
					{ key: buildScalarString('updated') }
				),
				buildArrayItem(buildVariable(valueAfterVar.raw), {
					key: buildScalarString('value'),
				}),
				buildArrayItem(buildVariable(previousVar.raw), {
					key: buildScalarString('previous'),
				}),
			])
		)
	);

	return statements;
}

export function buildWpOptionUnsupportedRouteStatements(
	options: BuildWpOptionUnsupportedRouteOptions
): PhpStmt[] {
	return [
		buildWpErrorReturn({
			code: options.errorCodeFactory('unsupported_operation'),
			message: `Operation not supported for ${options.pascalName} option.`,
			status: 501,
		}),
	];
}
