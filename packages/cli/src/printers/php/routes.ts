import type { Reporter } from '@wpkernel/core/reporter';
import type { IRResource, IRRoute } from '../../ir';
import type { PrinterContext } from '../types';
import { type PhpFileBuilder } from './builder';
import { assembleMethodTemplate, PHP_INDENT } from './template';
import { escapeSingleQuotes, toPascalCase } from './utils';
import { createWpPostHandlers } from './wp-post';
import { createWpTaxonomyHandlers } from './wp-taxonomy';
import { createWpOptionHandlers } from './wp-option';
import { createTransientHandlers } from './transient';

export function createRouteHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: IRRoute[];
}): string[][] {
	const routeDefinitions = options.routes.map((route) => ({
		route,
		methodName: createRouteMethodName(route, options.context),
	}));
	let methods: string[][];

	switch (options.resource.storage?.mode) {
		case 'wp-post':
			methods = createWpPostHandlers({
				builder: options.builder,
				context: options.context,
				resource: options.resource,
				routes: routeDefinitions,
			});
			break;
		case 'wp-taxonomy':
			methods = createWpTaxonomyHandlers({
				builder: options.builder,
				context: options.context,
				resource: options.resource,
				routes: routeDefinitions,
			});
			break;
		case 'wp-option':
			methods = createWpOptionHandlers({
				builder: options.builder,
				context: options.context,
				resource: options.resource,
				routes: routeDefinitions,
			});
			break;
		case 'transient':
			methods = createTransientHandlers({
				builder: options.builder,
				context: options.context,
				resource: options.resource,
				routes: routeDefinitions,
			});
			break;
		default:
			methods = createRouteStubs(options);
			break;
	}

	return applyPolicyGuards({
		methods,
		routeDefinitions,
	});
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
		const missingPolicy = isWriteRoute(route.method) && !route.policy;
		if (!missingPolicy) {
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
		assembleMethodTemplate({
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

function applyPolicyGuards(options: {
	methods: string[][];
	routeDefinitions: Array<{ route: IRRoute }>;
}): string[][] {
	const guarded: string[][] = [];
	const routeCount = options.routeDefinitions.length;

	for (let index = 0; index < options.methods.length; index += 1) {
		const methodLines = options.methods[index]!;
		if (index < routeCount) {
			const route = options.routeDefinitions[index]!.route;
			guarded.push(injectPolicyGuard(methodLines, route));
		} else {
			guarded.push(methodLines);
		}
	}

	return guarded;
}

function injectPolicyGuard(methodLines: string[], route: IRRoute): string[] {
	if (!route.policy) {
		return methodLines;
	}

	const openIndex = methodLines.findIndex((line) => line.trim() === '{');
	if (openIndex === -1) {
		return methodLines;
	}

	const guardLines = [
		`${PHP_INDENT.repeat(2)}$permission = Policy::enforce( '${escapeSingleQuotes(route.policy)}', $request );`,
		`${PHP_INDENT.repeat(2)}if ( is_wp_error( $permission ) ) {`,
		`${PHP_INDENT.repeat(3)}return $permission;`,
		`${PHP_INDENT.repeat(2)}}`,
		'',
	];

	const next = [...methodLines];
	next.splice(openIndex + 1, 0, ...guardLines);
	return next;
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
