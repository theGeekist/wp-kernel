import {
	buildDocComment,
	type PhpAstBuilderAdapter,
	type PhpAttributes,
	type PhpDocComment,
} from '@wpkernel/php-json-ast';

import { DEFAULT_DOC_HEADER } from '../../constants';
import type { ResourceControllerRouteMetadata } from '../../types';

export function appendGeneratedFileDocblock(
	builder: PhpAstBuilderAdapter,
	extraLines: Iterable<string>
): void {
	for (const line of DEFAULT_DOC_HEADER) {
		builder.appendDocblock(line);
	}

	for (const line of extraLines) {
		builder.appendDocblock(line);
	}
}

export function buildGeneratedFileDocComment(
	extraLines: Iterable<string>
): PhpDocComment {
	const lines = [...DEFAULT_DOC_HEADER, ...extraLines];
	return buildDocComment(lines);
}

export function buildDocCommentAttributes(
	lines: readonly (string | undefined)[]
): PhpAttributes | undefined {
	const docLines = lines.filter(Boolean) as string[];
	if (docLines.length === 0) {
		return undefined;
	}

	return { comments: [buildDocComment(docLines)] };
}

export interface RestBaseControllerDocblockOptions {
	readonly origin: string;
	readonly sanitizedNamespace: string;
}

export function buildRestBaseControllerDocblock(
	options: RestBaseControllerDocblockOptions
): readonly string[] {
	return [
		`Source: ${options.origin} → resources (namespace: ${options.sanitizedNamespace})`,
	];
}

export interface RestControllerDocblockOptions {
	readonly origin: string;
	readonly resourceName: string;
	readonly schemaKey: string;
	readonly schemaProvenance: string;
	readonly routes: readonly ResourceControllerRouteMetadata[];
}

export function buildRestControllerDocblock(
	options: RestControllerDocblockOptions
): readonly string[] {
	return [
		`Source: ${options.origin} → resources.${options.resourceName}`,
		`Schema: ${options.schemaKey} (${options.schemaProvenance})`,
		...options.routes.map(
			(route) => `Route: [${route.method}] ${route.path}`
		),
	];
}

export interface RestIndexDocblockOptions {
	readonly origin: string;
}

export function buildRestIndexDocblock(
	options: RestIndexDocblockOptions
): readonly string[] {
	return [`Source: ${options.origin} → php/index`];
}

export function buildPolicyCallbackDocblock(): readonly string[] {
	return ['Create a permission callback closure for a policy.'];
}

export function buildPolicyEnforceDocblock(): readonly string[] {
	return [
		'Evaluate a policy against the current user.',
		'@return bool|WP_Error',
	];
}

export interface PersistenceRegistryDocblockOptions {
	readonly origin: string;
}

export function buildPersistenceRegistryDocblock(
	options: PersistenceRegistryDocblockOptions
): readonly string[] {
	return [
		`Source: ${options.origin} → resources (storage + identity metadata)`,
	];
}
