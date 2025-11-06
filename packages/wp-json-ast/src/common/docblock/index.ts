import {
	buildDocComment,
	type PhpAstBuilderAdapter,
	type PhpAttributes,
	type PhpDocComment,
} from '@wpkernel/php-json-ast';

import { DEFAULT_DOC_HEADER } from '../../constants';
import type { ResourceControllerRouteMetadata } from '../../types';

/**
 * Appends the standard generated file docblock to a builder.
 *
 * @param    builder    - The AST builder.
 * @param    extraLines - Extra lines to add to the docblock.
 * @category WordPress AST
 */
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

/**
 * Builds a doc comment for a generated file.
 *
 * @param    extraLines - Extra lines to add to the doc comment.
 * @returns A PHP doc comment.
 * @category WordPress AST
 */
export function buildGeneratedFileDocComment(
	extraLines: Iterable<string>
): PhpDocComment {
	const lines = [...DEFAULT_DOC_HEADER, ...extraLines];
	return buildDocComment(lines);
}

/**
 * Builds doc comment attributes from a list of lines.
 *
 * @param    lines - The lines to add to the doc comment.
 * @returns PHP attributes, or undefined if there are no lines.
 * @category WordPress AST
 */
export function buildDocCommentAttributes(
	lines: readonly (string | undefined)[]
): PhpAttributes | undefined {
	const docLines = lines.filter(Boolean) as string[];
	if (docLines.length === 0) {
		return undefined;
	}

	return { comments: [buildDocComment(docLines)] };
}

/**
 * Options for building a REST base controller docblock.
 *
 * @category WordPress AST
 */
export interface RestBaseControllerDocblockOptions {
	/** The origin of the controller. */
	readonly origin: string;
	/** The sanitized namespace of the controller. */
	readonly sanitizedNamespace: string;
}

/**
 * Builds a docblock for a REST base controller.
 *
 * @param    options - The options for building the docblock.
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildRestBaseControllerDocblock(
	options: RestBaseControllerDocblockOptions
): readonly string[] {
	return [
		`Source: ${options.origin} → resources (namespace: ${options.sanitizedNamespace})`,
	];
}

/**
 * Options for building a REST controller docblock.
 *
 * @category WordPress AST
 */
export interface RestControllerDocblockOptions {
	/** The origin of the controller. */
	readonly origin: string;
	/** The name of the resource. */
	readonly resourceName: string;
	/** The key of the schema. */
	readonly schemaKey: string;
	/** The provenance of the schema. */
	readonly schemaProvenance: string;
	/** The routes of the controller. */
	readonly routes: readonly ResourceControllerRouteMetadata[];
}

/**
 * Builds a docblock for a REST controller.
 *
 * @param    options - The options for building the docblock.
 * @returns The docblock lines.
 * @category WordPress AST
 */
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

/**
 * Options for building a REST index docblock.
 *
 * @category WordPress AST
 */
export interface RestIndexDocblockOptions {
	/** The origin of the index. */
	readonly origin: string;
}

/**
 * Builds a docblock for a REST index.
 *
 * @param    options - The options for building the docblock.
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildRestIndexDocblock(
	options: RestIndexDocblockOptions
): readonly string[] {
	return [`Source: ${options.origin} → php/index`];
}

/**
 * Builds a docblock for a capability callback.
 *
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildCapabilityCallbackDocblock(): readonly string[] {
	return ['Create a permission callback closure for a capability.'];
}

/**
 * Builds a docblock for a capability enforce function.
 *
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildCapabilityEnforceDocblock(): readonly string[] {
	return [
		'Evaluate a capability against the current user.',
		'@return bool|WP_Error',
	];
}

/**
 * Builds a docblock for a block manifest.
 *
 * @param    options        - The options for building the docblock.
 * @param    options.origin
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildBlockManifestDocblock(options: {
	readonly origin: string;
}): readonly string[] {
	return [`Source: ${options.origin} → blocks.ssr.manifest`];
}

/**
 * Builds a docblock for a block registrar.
 *
 * @param    options        - The options for building the docblock.
 * @param    options.origin
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildBlockRegistrarDocblock(options: {
	readonly origin: string;
}): readonly string[] {
	return [`Source: ${options.origin} → blocks.ssr.register`];
}

/**
 * Options for building a persistence registry docblock.
 *
 * @category WordPress AST
 */
export interface PersistenceRegistryDocblockOptions {
	/** The origin of the registry. */
	readonly origin: string;
}

/**
 * Builds a docblock for a persistence registry.
 *
 * @param    options - The options for building the docblock.
 * @returns The docblock lines.
 * @category WordPress AST
 */
export function buildPersistenceRegistryDocblock(
	options: PersistenceRegistryDocblockOptions
): readonly string[] {
	return [
		`Source: ${options.origin} → resources (storage + identity metadata)`,
	];
}
