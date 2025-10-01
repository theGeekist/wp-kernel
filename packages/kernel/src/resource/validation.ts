/**
 * Resource configuration validation
 *
 * Validates resource configuration at definition time to catch
 * developer errors early with helpful error messages.
 *
 * @see Product Specification § 4.1 Resources
 */
import { KernelError } from '../error/index.js';
import type { ResourceConfig } from './types.js';

/**
 * Validate resource configuration
 *
 * Throws DeveloperError for invalid configs to catch issues at dev time.
 * Validates:
 * - Resource name (required, kebab-case)
 * - Routes object (at least one route required)
 * - Each route definition (path, method)
 * - HTTP method validity
 *
 * @param config - Resource configuration to validate
 * @throws DeveloperError if configuration is invalid
 *
 * @example
 * ```ts
 * validateConfig({
 *   name: 'thing',
 *   routes: {
 *     list: { path: '/wpk/v1/things', method: 'GET' }
 *   }
 * }); // ✓ Valid
 *
 * validateConfig({
 *   name: 'Thing', // ✗ Must be kebab-case
 *   routes: {}
 * }); // Throws DeveloperError
 * ```
 */
export function validateConfig<T, TQuery>(
	config: ResourceConfig<T, TQuery>
): void {
	// Validate name
	if (!config.name || typeof config.name !== 'string') {
		throw new KernelError('DeveloperError', {
			message: 'Resource config must have a valid "name" property',
			data: {
				validationErrors: [
					{
						field: 'name',
						message: 'Required string property',
					},
				],
			},
		});
	}

	if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
		throw new KernelError('DeveloperError', {
			message: `Resource name "${config.name}" must be lowercase with hyphens only (kebab-case)`,
			data: {
				validationErrors: [
					{
						field: 'name',
						message:
							'Must match pattern: lowercase letters, numbers, hyphens',
					},
				],
			},
		});
	}

	// Validate routes
	if (!config.routes || typeof config.routes !== 'object') {
		throw new KernelError('DeveloperError', {
			message: 'Resource config must have a "routes" object',
			data: {
				validationErrors: [
					{
						field: 'routes',
						message: 'Required object property',
					},
				],
			},
			context: { resourceName: config.name },
		});
	}

	// At least one route must be defined
	const routeKeys = Object.keys(config.routes);
	if (routeKeys.length === 0) {
		throw new KernelError('DeveloperError', {
			message: `Resource "${config.name}" must define at least one route`,
			data: {
				validationErrors: [
					{
						field: 'routes',
						message:
							'At least one route (list, get, create, update, remove) required',
					},
				],
			},
			context: { resourceName: config.name },
		});
	}

	// Validate each route definition
	const validRouteNames = ['list', 'get', 'create', 'update', 'remove'];
	for (const [routeName, route] of Object.entries(config.routes)) {
		if (!validRouteNames.includes(routeName)) {
			throw new KernelError('DeveloperError', {
				message: `Invalid route name "${routeName}" in resource "${config.name}"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}`,
							message: `Must be one of: ${validRouteNames.join(', ')}`,
							code: 'INVALID_ROUTE_NAME',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		if (!route || typeof route !== 'object') {
			throw new KernelError('DeveloperError', {
				message: `Route "${routeName}" in resource "${config.name}" must be an object`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}`,
							message: 'Must be an object with path and method',
							code: 'INVALID_ROUTE_TYPE',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		if (!route.path || typeof route.path !== 'string') {
			throw new KernelError('DeveloperError', {
				message: `Route "${routeName}" in resource "${config.name}" must have a valid "path"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}.path`,
							message: 'Required string property',
							code: 'MISSING_PATH',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		if (!route.method || typeof route.method !== 'string') {
			throw new KernelError('DeveloperError', {
				message: `Route "${routeName}" in resource "${config.name}" must have a valid "method"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}.method`,
							message:
								'Required string property (GET, POST, PUT, PATCH, DELETE)',
							code: 'MISSING_METHOD',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
		if (!validMethods.includes(route.method)) {
			throw new KernelError('DeveloperError', {
				message: `Invalid HTTP method "${route.method}" for route "${routeName}" in resource "${config.name}"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}.method`,
							message: `Must be one of: ${validMethods.join(', ')}`,
							code: 'INVALID_METHOD',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}
	}
}
