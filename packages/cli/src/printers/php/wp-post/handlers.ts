import type { WpPostContext } from './context';
import { createHelperMethods } from './helpers';
import { createListMethod } from './list';
import { createGetMethod } from './get';
import { createCreateMethod } from './create';
import { createUpdateMethod } from './update';
import { createDeleteMethod } from './delete';
import { createStubMethod } from './stub';
import { determineRouteKind } from './routes';
import type { RouteKind, WpPostRouteDefinition } from './types';

export function buildWpPostMethods(
	context: WpPostContext,
	definitions: WpPostRouteDefinition[]
): string[][] {
	const methods: string[][] = [];

	for (const definition of definitions) {
		const kind = determineRouteKind(
			definition.route,
			context.identity.param,
			context.canonicalBasePaths
		);

		const method = createMethodForKind(context, definition, kind);
		if (method) {
			methods.push(method);
		}
	}

	methods.push(...createHelperMethods(context));

	return methods;
}

function createMethodForKind(
	context: WpPostContext,
	definition: WpPostRouteDefinition,
	kind: RouteKind | undefined
): string[] | undefined {
	switch (kind) {
		case 'list':
			return createListMethod(context, definition);
		case 'get':
			return createGetMethod(context, definition);
		case 'create':
			return createCreateMethod(context, definition);
		case 'update':
			return createUpdateMethod(context, definition);
		case 'remove':
			return createDeleteMethod(context, definition);
		default:
			return createStubMethod(context, definition);
	}
}
