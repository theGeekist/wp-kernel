import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from './types';
import { determineWpTaxonomyRouteKind } from './routes';
import { createListMethod } from './methods/list';
import { createGetMethod } from './methods/get';
import { createCreateMethod } from './methods/create';
import { createUpdateMethod } from './methods/update';
import { createRemoveMethod } from './methods/remove';
import { createUnsupportedMethod } from './methods/unsupported';
import { createHelperMethods } from './helpers';

export function buildWpTaxonomyMethods(
	context: WpTaxonomyContext,
	definitions: WpTaxonomyRouteDefinition[]
): string[][] {
	const methods: string[][] = [];

	for (const definition of definitions) {
		const kind = determineWpTaxonomyRouteKind(
			definition.route,
			context.identity.param
		);

		switch (kind) {
			case 'list':
				methods.push(createListMethod(context, definition));
				break;
			case 'get':
				methods.push(createGetMethod(context, definition));
				break;
			case 'create':
				methods.push(createCreateMethod(context, definition));
				break;
			case 'update':
				methods.push(createUpdateMethod(context, definition));
				break;
			case 'remove':
				methods.push(createRemoveMethod(context, definition));
				break;
			default:
				methods.push(createUnsupportedMethod(context, definition));
				break;
		}
	}

	methods.push(...createHelperMethods(context));

	return methods;
}
