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

export type RestControllerRouteStatementsBuilder = (
	context: RestControllerRouteStatementsContext
) => readonly PhpStmt[] | null | undefined;

export interface RestControllerRouteHandlers {
	readonly list?: RestControllerRouteStatementsBuilder;
	readonly get?: RestControllerRouteStatementsBuilder;
	readonly create?: RestControllerRouteStatementsBuilder;
	readonly update?: RestControllerRouteStatementsBuilder;
	readonly remove?: RestControllerRouteStatementsBuilder;
	readonly custom?: RestControllerRouteStatementsBuilder;
}

export interface RestControllerRouteTransientHandlers {
	readonly get?: RestControllerRouteStatementsBuilder;
	readonly set?: RestControllerRouteStatementsBuilder;
	readonly delete?: RestControllerRouteStatementsBuilder;
	readonly unsupported?: RestControllerRouteStatementsBuilder;
}

export interface RestControllerRouteOptionHandlers {
	readonly get?: RestControllerRouteStatementsBuilder;
	readonly update?: RestControllerRouteStatementsBuilder;
	readonly unsupported?: RestControllerRouteStatementsBuilder;
}

export type RestControllerRouteStorageMode =
	| 'transient'
	| 'wp-option'
	| 'wp-taxonomy'
	| 'wp-post'
	| 'file'
	| 'custom'
	| (string & {});

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
}

export type BuildRouteFallbackStatements = (
	definition: RestControllerRouteDefinition
) => readonly PhpStmt[];

export function buildResourceControllerRouteSet(
	options: BuildResourceControllerRouteSetOptions
): RestControllerRoutePlan {
	const fallbackBuilder =
		options.buildFallbackStatements ?? buildNotImplementedStatements;

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
	definition: RestControllerRouteDefinition
): readonly PhpStmt[] {
	const todo = buildStmtNop({
		comments: [
			buildComment(
				`// TODO: Implement handler for [${definition.method}] ${definition.path}.`
			),
		],
	});

	const errorExpr = buildNew(buildName(['WP_Error']), [
		buildArg(buildScalarInt(501)),
		buildArg(buildScalarString('Not Implemented')),
	]);

	return [todo, buildReturn(errorExpr)];
}
