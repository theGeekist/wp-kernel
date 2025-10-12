import type { PrinterContext } from '../../types';
import type { IRRoute } from '../../../ir';

export function createRoutes(
	entries: Array<[IRRoute['method'], string]>
): IRRoute[] {
	return entries.map(([method, path], index) => ({
		method,
		path,
		hash: `route-${index}`,
		transport: 'local',
	}));
}

export function createPrinterContext(): PrinterContext {
	return {
		ir: {
			meta: {
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
		},
	} as unknown as PrinterContext;
}

export function createRouteDefinitions(
	routes: IRRoute[],
	context: PrinterContext
): Array<{
	route: IRRoute;
	methodName: string;
}> {
	return routes.map((route) => ({
		route,
		methodName: inferMethodName(route, context),
	}));
}

function inferMethodName(route: IRRoute, context: PrinterContext): string {
	const method = route.method.toLowerCase();
	const segments = route.path
		.replace(/^\/+/, '')
		.split('/')
		.filter(Boolean)
		.map((segment) => segment.replace(/^:/, ''));
	const suffix = segments
		.filter(
			(segment) =>
				segment.toLowerCase() !==
				context.ir.meta.sanitizedNamespace?.toLowerCase()
		)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('');
	return `${method}${suffix || 'Route'}`;
}
