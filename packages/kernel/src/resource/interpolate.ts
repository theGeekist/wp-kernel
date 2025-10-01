/**
 * REST path interpolation utilities
 *
 * Handles dynamic path segments like :id, :slug in REST routes.
 *
 * @example
 * ```ts
 * interpolatePath('/wpk/v1/things/:id', { id: 123 })
 * // => '/wpk/v1/things/123'
 *
 * interpolatePath('/wpk/v1/things/:id/comments/:commentId', { id: 1, commentId: 42 })
 * // => '/wpk/v1/things/1/comments/42'
 * ```
 */

import { KernelError } from '@kernel/errors';

/**
 * Path parameter values (string, number, or boolean)
 */
export type PathParams = Record<string, string | number | boolean>;

/**
 * Interpolate dynamic segments in a REST path
 *
 * Replaces `:paramName` patterns with values from the params object.
 * Throws DeveloperError if required params are missing.
 *
 * @param path   - REST path with :param placeholders
 * @param params - Parameter values to interpolate
 * @return Interpolated path
 * @throws DeveloperError if required params are missing
 *
 * @example
 * ```ts
 * interpolatePath('/wpk/v1/things/:id', { id: 123 })
 * // => '/wpk/v1/things/123'
 *
 * interpolatePath('/wpk/v1/things/:id', {}) // throws DeveloperError
 * ```
 */
export function interpolatePath(path: string, params: PathParams = {}): string {
	// Find all :param patterns
	const paramPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
	const matches = Array.from(path.matchAll(paramPattern));

	// Track which params are required
	const requiredParams = matches
		.map((match) => match[1])
		.filter((p): p is string => p !== undefined);
	const missingParams = requiredParams.filter(
		(param) =>
			!(param in params) ||
			params[param] === null ||
			params[param] === undefined
	);

	if (missingParams.length > 0) {
		throw new KernelError('DeveloperError', {
			message: `Missing required path parameters: ${missingParams.join(', ')}`,
			data: {
				validationErrors: [],
				path,
				requiredParams,
				providedParams: Object.keys(params),
				missingParams,
			},
			context: {
				path,
			},
		});
	}

	// Replace :param with values
	let interpolated = path;
	for (const [fullMatch, paramName] of matches) {
		if (paramName) {
			const value = params[paramName];
			interpolated = interpolated.replace(fullMatch, String(value));
		}
	}

	return interpolated;
}

/**
 * Extract parameter names from a path
 *
 * @param path - REST path with :param placeholders
 * @return Array of parameter names
 *
 * @example
 * ```ts
 * extractPathParams('/wpk/v1/things/:id')
 * // => ['id']
 *
 * extractPathParams('/wpk/v1/things/:id/comments/:commentId')
 * // => ['id', 'commentId']
 * ```
 */
export function extractPathParams(path: string): string[] {
	const paramPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
	const matches = Array.from(path.matchAll(paramPattern));
	return matches
		.map((match) => match[1])
		.filter((p): p is string => p !== undefined);
}
