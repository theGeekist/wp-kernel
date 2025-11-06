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

import type { ResourceControllerRouteMetadata } from '../../types';
import type {
	RestControllerRouteDefinition,
	RestControllerRoutePlan,
	RestControllerRouteStatementsContext,
} from '../pipeline';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * @category WordPress AST
 */
export type RestControllerRouteStatementsBuilder = (
	context: RestControllerRouteStatementsContext
) => readonly PhpStmt[] | null | undefined;

/**
 * @category WordPress AST
 */
export interface RestControllerRouteHandlers {
	readonly list?: RestControllerRouteStatementsBuilder;
	readonly get?: RestControllerRouteStatementsBuilder;
	readonly create?: RestControllerRouteStatementsBuilder;
	readonly update?: RestControllerRouteStatementsBuilder;
	readonly remove?: RestControllerRouteStatementsBuilder;
	readonly custom?: RestControllerRouteStatementsBuilder;
}

/**
 * @category WordPress AST
 */
export interface RestControllerRouteTransientHandlers {
	readonly get?: RestControllerRouteStatementsBuilder;
	readonly set?: RestControllerRouteStatementsBuilder;
	readonly delete?: RestControllerRouteStatementsBuilder;
	readonly unsupported?: RestControllerRouteStatementsBuilder;
}

/**
 * @category WordPress AST
 */
export interface RestControllerRouteOptionHandlers {
	readonly get?: RestControllerRouteStatementsBuilder;
	readonly update?: RestControllerRouteStatementsBuilder;
	readonly unsupported?: RestControllerRouteStatementsBuilder;
}

/**
 * @category WordPress AST
 */
export type RestControllerRouteStorageMode =
	| 'transient'
	| 'wp-option'
	| 'wp-taxonomy'
	| 'wp-post'
	| 'file'
	| 'custom'
	| (string & {});

/**
 * @category WordPress AST
 */
export interface BuildResourceControllerRouteSetOptions {
	readonly plan: Pick<
		RestControllerRoutePlan,
		'definition' | 'methodName' | 'docblockSummary'
	>;
	readonly storageMode?: RestControllerRouteStorageMode;
	readonly handlers?: RestControllerRouteHandlers;
	readonly transientHandlers?: RestControllerRouteTransientHandlers;
	readonly optionHandlers?: RestControllerRouteOptionHandlers;
	readonly buildFallbackStatements?: BuildRouteFallbackStatements;
	readonly fallbackContext?: RestControllerRouteFallbackContext;
}

/**
 * @category WordPress AST
 */
export type BuildRouteFallbackStatements = (
	definition: RestControllerRouteDefinition
) => readonly PhpStmt[];

/**
 * @category WordPress AST
 */
export interface RestControllerRouteFallbackContext {
	readonly resource?: string;
	readonly transport?: string;
	readonly kind?: ResourceControllerRouteMetadata['kind'];
	readonly storageMode?: string;
	readonly reason?: string;
	readonly hint?: string;
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildResourceControllerRouteSet(
	options: BuildResourceControllerRouteSetOptions
): RestControllerRoutePlan {
	const fallbackBuilder =
		options.buildFallbackStatements ??
		((definition: RestControllerRouteDefinition) =>
			buildNotImplementedStatements(definition, options.fallbackContext));

	return {
		definition: options.plan.definition,
		methodName: options.plan.methodName,
		docblockSummary: options.plan.docblockSummary,
		buildStatements: (context) =>
			resolveRouteStatements(options, context) ?? null,
		buildFallbackStatements: () => fallbackBuilder(options.plan.definition),
	} satisfies RestControllerRoutePlan;
}

function resolveRouteStatements(
	options: BuildResourceControllerRouteSetOptions,
	context: RestControllerRouteStatementsContext
): readonly PhpStmt[] | null | undefined {
	const handler = resolveRouteHandler(options, context);
	if (!handler) {
		return null;
	}

	return handler(context);
}

function resolveRouteHandler(
	options: BuildResourceControllerRouteSetOptions,
	context: RestControllerRouteStatementsContext
): RestControllerRouteStatementsBuilder | undefined {
	const storageMode = options.storageMode;
	if (storageMode === 'transient') {
		return resolveTransientHandler(options.transientHandlers, context);
	}

	if (storageMode === 'wp-option') {
		return resolveOptionHandler(options.optionHandlers, context);
	}

	return resolveDefaultHandler(options.handlers, context.metadata);
}

function resolveTransientHandler(
	handlers: RestControllerRouteTransientHandlers | undefined,
	context: RestControllerRouteStatementsContext
): RestControllerRouteStatementsBuilder | undefined {
	if (!handlers) {
		return undefined;
	}

	const method = normalizeMethod(context);
	if (method === 'GET') {
		return handlers.get;
	}

	if (WRITE_METHODS.has(method)) {
		return handlers.set;
	}

	if (method === 'DELETE') {
		return handlers.delete;
	}

	return handlers.unsupported;
}

function resolveOptionHandler(
	handlers: RestControllerRouteOptionHandlers | undefined,
	context: RestControllerRouteStatementsContext
): RestControllerRouteStatementsBuilder | undefined {
	if (!handlers) {
		return undefined;
	}

	const method = normalizeMethod(context);
	if (method === 'GET') {
		return handlers.get;
	}

	if (WRITE_METHODS.has(method)) {
		return handlers.update;
	}

	return handlers.unsupported;
}

function resolveDefaultHandler(
	handlers: RestControllerRouteHandlers | undefined,
	metadata: ResourceControllerRouteMetadata
): RestControllerRouteStatementsBuilder | undefined {
	if (!handlers) {
		return undefined;
	}

	switch (metadata.kind) {
		case 'list':
			return handlers.list;
		case 'get':
			return handlers.get;
		case 'create':
			return handlers.create;
		case 'update':
			return handlers.update;
		case 'remove':
			return handlers.remove;
		case 'custom':
			return handlers.custom;
		default:
			return undefined;
	}
}

function normalizeMethod(
	context: RestControllerRouteStatementsContext
): string {
	return context.metadata.method.toUpperCase();
}

function buildNotImplementedStatements(
	definition: RestControllerRouteDefinition,
	context?: RestControllerRouteFallbackContext
): readonly PhpStmt[] {
	const fallbackMetadata = buildFallbackMetadata(definition, context);
	const comments = buildFallbackComments(definition, context);

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

function buildFallbackComments(
	definition: RestControllerRouteDefinition,
	context?: RestControllerRouteFallbackContext
) {
	const commentLines = [
		`// TODO: Implement handler for [${definition.method}] ${definition.path}.`,
	];

	if (context?.reason) {
		commentLines.push(`// Reason: ${context.reason}`);
	}

	if (context?.hint) {
		commentLines.push(`// Hint: ${context.hint}`);
	}

	return commentLines.map((line) => buildComment(line));
}

function buildFallbackMetadata(
	definition: RestControllerRouteDefinition,
	context?: RestControllerRouteFallbackContext
): Record<string, unknown> {
	const metadata: Record<string, unknown> = {
		method: definition.method,
		path: definition.path,
	};

	const optionalEntries: ReadonlyArray<
		readonly [keyof RestControllerRouteFallbackContext, unknown]
	> = [
		['resource', context?.resource],
		['transport', context?.transport],
		['kind', context?.kind],
		['storageMode', context?.storageMode],
		['reason', context?.reason],
		['hint', context?.hint],
	];

	for (const [key, value] of optionalEntries) {
		if (value !== undefined) {
			metadata[key] = value;
		}
	}

	return metadata;
}
