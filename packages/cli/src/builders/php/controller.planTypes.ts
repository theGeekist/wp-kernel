import { type PhpStmtClassMethod } from '@wpkernel/php-json-ast';
import type {
	ResolvedIdentity,
	WpPostRouteBundle,
	ResourceControllerRouteMetadata,
	RestControllerRouteHandlers,
	RestControllerRouteOptionHandlers,
	RestControllerRouteTransientHandlers,
} from '@wpkernel/wp-json-ast';
import type { IRResource, IRv1 } from '../../ir';
import type { BuilderApplyOptions } from '../../runtime/types';

/**
 * WordPress resource storage modes supported by the PHP generator.
 *
 * @category Builders
 */
export type ResourceStorageMode =
	NonNullable<IRResource['storage']> extends {
		mode: infer Mode;
	}
		? Mode
		: never;

/**
 * Factory type for generating WordPress error code identifiers.
 *
 * @category Builders
 */
export type ErrorCodeFactory = (suffix: string) => string;

/**
 * Context shared across controller route-plan builders.
 *
 * @category Builders
 */
export interface ControllerBuildContext {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: ErrorCodeFactory;
	readonly storageArtifacts: StorageArtifacts;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly routeMetadataList: readonly ResourceControllerRouteMetadata[];
}

/**
 * Storage helper artifacts (methods + handler bundles) projected into a controller.
 *
 * @category Builders
 */
export interface StorageArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly helperSignatures: readonly string[];
	readonly routeHandlers?: RestControllerRouteHandlers;
	readonly optionHandlers?: RestControllerRouteOptionHandlers;
	readonly transientHandlers?: RestControllerRouteTransientHandlers;
}

/**
 * Determines whether an HTTP method mutates WordPress state.
 *
 * @param    method - HTTP method to test
 * @returns `true` when the verb is POST/PUT/PATCH/DELETE
 * @category Builders
 * @example
 * ```ts
 * if (isWriteRoute(route.method)) {
 *   reporter.warn('Missing capability for write route.');
 * }
 * ```
 */
export function isWriteRoute(method: string): boolean {
	switch (method.toUpperCase()) {
		case 'POST':
		case 'PUT':
		case 'PATCH':
		case 'DELETE':
			return true;
		default:
			return false;
	}
}
