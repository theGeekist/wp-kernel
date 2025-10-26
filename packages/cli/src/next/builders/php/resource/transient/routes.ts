import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	type PhpStmt,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';
import {
	buildFunctionCall,
	buildFunctionCallAssignmentStatement,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../utils';
import { appendResourceCacheEvent } from '../cache';
import { buildWpErrorReturn } from '../errors';
import { ensureTransientStorage } from './shared';

export interface BuildTransientRouteBaseOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
}

export interface BuildTransientUnsupportedRouteOptions
	extends BuildTransientRouteBaseOptions {
	readonly errorCodeFactory: (suffix: string) => string;
}

export function buildTransientGetRouteStatements(
	options: BuildTransientRouteBaseOptions
): PhpStmt[] {
	ensureTransientStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'read',
		segments: options.resource.cacheKeys.get.segments,
		description: 'Read transient value',
	});

	const keyVar = normaliseVariableReference('key');
	const valueVar = normaliseVariableReference('value');

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: keyVar.display,
			subject: 'this',
			method: `get${options.pascalName}TransientKey`,
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: valueVar.display,
			functionName: 'get_transient',
			args: [buildArg(buildVariable(keyVar.raw))],
		})
	);

	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable(keyVar.raw), {
					key: buildScalarString('key'),
				}),
				buildArrayItem(buildVariable(valueVar.raw), {
					key: buildScalarString('value'),
				}),
			])
		)
	);

	return statements;
}

export function buildTransientSetRouteStatements(
	options: BuildTransientRouteBaseOptions
): PhpStmt[] {
	ensureTransientStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'invalidate',
		segments: options.resource.cacheKeys.get.segments,
		description: 'Invalidate transient value',
	});

	const keyVar = normaliseVariableReference('key');
	const previousVar = normaliseVariableReference('previous');
	const valueVar = normaliseVariableReference('value');
	const expirationVar = normaliseVariableReference('expiration');
	const storedVar = normaliseVariableReference('stored');
	const currentVar = normaliseVariableReference('current');

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: keyVar.display,
			subject: 'this',
			method: `get${options.pascalName}TransientKey`,
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: previousVar.display,
			functionName: 'get_transient',
			args: [buildArg(buildVariable(keyVar.raw))],
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
			expirationVar,
			buildMethodCallExpression({
				subject: 'this',
				method: `normalise${options.pascalName}Expiration`,
				args: [
					buildArg(
						buildMethodCallExpression({
							subject: 'request',
							method: 'get_param',
							args: [buildArg(buildScalarString('expiration'))],
						})
					),
				],
			})
		)
	);

	statements.push(buildStmtNop());

	statements.push(
		buildVariableAssignment(
			storedVar,
			buildFunctionCall('set_transient', [
				buildArg(buildVariable(keyVar.raw)),
				buildArg(buildVariable(valueVar.raw)),
				buildArg(buildVariable(expirationVar.raw)),
			])
		)
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: currentVar.display,
			functionName: 'get_transient',
			args: [buildArg(buildVariable(keyVar.raw))],
		})
	);

	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable(keyVar.raw), {
					key: buildScalarString('key'),
				}),
				buildArrayItem(
					buildScalarCast('bool', buildVariable(storedVar.raw)),
					{ key: buildScalarString('stored') }
				),
				buildArrayItem(buildVariable(currentVar.raw), {
					key: buildScalarString('value'),
				}),
				buildArrayItem(buildVariable(previousVar.raw), {
					key: buildScalarString('previous'),
				}),
				buildArrayItem(buildVariable(expirationVar.raw), {
					key: buildScalarString('expiration'),
				}),
			])
		)
	);

	return statements;
}

export function buildTransientDeleteRouteStatements(
	options: BuildTransientRouteBaseOptions
): PhpStmt[] {
	ensureTransientStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'invalidate',
		segments: options.resource.cacheKeys.get.segments,
		description: 'Delete transient value',
	});

	const keyVar = normaliseVariableReference('key');
	const previousVar = normaliseVariableReference('previous');
	const deletedVar = normaliseVariableReference('deleted');

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: keyVar.display,
			subject: 'this',
			method: `get${options.pascalName}TransientKey`,
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: previousVar.display,
			functionName: 'get_transient',
			args: [buildArg(buildVariable(keyVar.raw))],
		})
	);

	statements.push(buildStmtNop());

	statements.push(
		buildVariableAssignment(
			deletedVar,
			buildFunctionCall('delete_transient', [
				buildArg(buildVariable(keyVar.raw)),
			])
		)
	);

	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable(keyVar.raw), {
					key: buildScalarString('key'),
				}),
				buildArrayItem(
					buildScalarCast('bool', buildVariable(deletedVar.raw)),
					{ key: buildScalarString('deleted') }
				),
				buildArrayItem(buildVariable(previousVar.raw), {
					key: buildScalarString('previous'),
				}),
			])
		)
	);

	return statements;
}

export function buildTransientUnsupportedRouteStatements(
	options: BuildTransientUnsupportedRouteOptions
): PhpStmt[] {
	ensureTransientStorage(options.resource);

	return [
		buildWpErrorReturn({
			code: options.errorCodeFactory('unsupported_operation'),
			message: `Operation not supported for ${options.pascalName} transient.`,
			status: 501,
		}),
	];
}
