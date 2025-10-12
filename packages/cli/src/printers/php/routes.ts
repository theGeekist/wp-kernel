import type { Reporter } from '@geekist/wp-kernel';
import type { IRResource, IRRoute } from '../../ir';
import type { PrinterContext } from '../types';
import { type PhpFileBuilder } from './builder';
import { createMethodTemplate, PHP_INDENT } from './template';
import { toPascalCase } from './utils';
import { createWpPostHandlers } from './wp-post';

export function createRouteHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: IRRoute[];
}): string[][] {
	if (options.resource.storage?.mode === 'wp-post') {
		const routeDefinitions = options.routes.map((route) => ({
			route,
			methodName: createRouteMethodName(route, options.context),
		}));

		return createWpPostHandlers({
			builder: options.builder,
			context: options.context,
			resource: options.resource,
			routes: routeDefinitions,
		});
	}

	return createRouteStubs(options);
}

export function createRouteMethodName(
	route: IRRoute,
	context: PrinterContext
): string {
	const method = route.method.toLowerCase();
	const segments = deriveRouteSegments(route.path, context);
	const suffix = segments.map(toPascalCase).join('') || 'Route';
	return `${method}${suffix}`;
}

export function warnOnMissingPolicies(options: {
	reporter: Reporter;
	resource: IRResource;
	routes: IRRoute[];
}): void {
	const { reporter, resource, routes } = options;

	for (const route of routes) {
		if (!isWriteRoute(route.method) || route.policy) {
			continue;
		}

		reporter.warn('Write route missing policy.', {
			resource: resource.name,
			method: route.method,
			path: route.path,
		});
	}
}

function createRouteStubs(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: IRRoute[];
}): string[][] {
	const { builder, resource, routes } = options;

	builder.addUse('WP_Error');
	builder.addUse('WP_REST_Request');

	return routes.map((route) =>
		createMethodTemplate({
			signature: `public function ${createRouteMethodName(
				route,
				options.context
			)}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [`Handle [${route.method}] ${route.path}.`],
			body: (body) => {
				if (routeUsesIdentity(route, resource.identity)) {
					const param = resource.identity?.param ?? 'id';
					body.line(`$${param} = $request->get_param( '${param}' );`);
					body.blank();
				}

				body.line(
					`// TODO: Implement handler for [${route.method}] ${route.path}.`
				);
				body.line("return new WP_Error( 501, 'Not Implemented' );");
			},
		})
	);
}

function deriveRouteSegments(
	routePath: string,
	context: PrinterContext
): string[] {
	const trimmed = routePath.replace(/^\/+/, '');
	if (!trimmed) {
		return [];
	}

	const segments = trimmed
		.split('/')
		.filter(Boolean)
		.map((segment) => segment.replace(/^:/, ''));

	const namespaceVariants = new Set(
		[
			context.ir.meta.namespace,
			context.ir.meta.namespace.replace(/\\/g, '/'),
			context.ir.meta.sanitizedNamespace,
			context.ir.meta.sanitizedNamespace.replace(/\\/g, '/'),
		]
			.map((value) =>
				value
					.split('/')
					.filter(Boolean)
					.map((segment) => segment.toLowerCase())
			)
			.map((variant) => variant.join('/'))
	);

	const normalisedSegments = segments.map((segment) => segment.toLowerCase());

	for (const variant of namespaceVariants) {
		const variantSegments = variant.split('/');
		let matches = true;
		for (let index = 0; index < variantSegments.length; index += 1) {
			if (normalisedSegments[index] !== variantSegments[index]) {
				matches = false;
				break;
			}
		}

		if (matches) {
			return segments.slice(variantSegments.length);
		}
	}

	return segments;
}

function routeUsesIdentity(
	route: IRRoute,
	identity: IRResource['identity']
): boolean {
	if (!identity?.param) {
		return false;
	}

	const placeholder = `:${identity.param.toLowerCase()}`;
	return route.path.toLowerCase().includes(placeholder);
}

function isWriteRoute(method: string): boolean {
	switch (method) {
		case 'POST':
		case 'PUT':
		case 'PATCH':
		case 'DELETE':
			return true;
		default:
			return false;
	}
}
