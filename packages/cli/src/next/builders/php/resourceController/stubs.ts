import {
	buildArg,
	buildComment,
	buildName,
	buildNew,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { ResourceControllerRouteMetadata } from '@wpkernel/wp-json-ast';
import type { IRRoute } from '../../../ir/publicTypes';

export interface BuildNotImplementedStatementsOptions {
	readonly route: IRRoute;
	readonly resourceName: string;
	readonly routeKind: ResourceControllerRouteMetadata['kind'];
	readonly storageMode?: string;
	readonly reason?: string;
	readonly hint?: string;
}

export function buildNotImplementedStatements(
	options: BuildNotImplementedStatementsOptions
): PhpStmt[] {
	const commentLines = [
		`// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`,
	];

	if (options.reason) {
		commentLines.push(`// Reason: ${options.reason}`);
	}

	if (options.hint) {
		commentLines.push(`// Hint: ${options.hint}`);
	}

	const fallbackMetadata: Record<string, unknown> = {
		resource: options.resourceName,
		method: options.route.method,
		path: options.route.path,
		transport: options.route.transport,
		kind: options.routeKind,
	};

	if (options.storageMode) {
		fallbackMetadata.storageMode = options.storageMode;
	}

	if (options.reason) {
		fallbackMetadata.reason = options.reason;
	}

	if (options.hint) {
		fallbackMetadata.hint = options.hint;
	}

	const comments = commentLines.map((line) => buildComment(line));

	const todo = buildStmtNop({
		comments,
		'wpk:fallback': fallbackMetadata,
	});

	const errorExpr = buildNew(
		buildName(['WP_Error']),
		[
			buildArg(buildScalarInt(501)),
			buildArg(buildScalarString('Not Implemented')),
		],
		{ 'wpk:fallback': fallbackMetadata }
	);

	const returnStatement = buildReturn(errorExpr, {
		'wpk:fallback': fallbackMetadata,
	});

	return [todo, returnStatement];
}
