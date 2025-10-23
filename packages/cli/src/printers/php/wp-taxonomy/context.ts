import type { PrinterContext } from '../../types';
import type { IRResource } from '../../../ir';
import type { PhpFileBuilder } from '../builder';
import { makeErrorCodeFactory, toPascalCase } from '../utils';
import { resolveIdentityConfig } from '../identity';
import type {
	WpTaxonomyRouteDefinition,
	WpTaxonomyStorage,
	WpTaxonomyContext,
} from './types';

export interface CreateWpTaxonomyContextOptions {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: WpTaxonomyRouteDefinition[];
}

export function createWpTaxonomyContext(
	options: CreateWpTaxonomyContextOptions
): WpTaxonomyContext {
	const storage = options.resource.storage as WpTaxonomyStorage;
	const pascalName = toPascalCase(options.resource.name);
	const identity = resolveIdentityConfig(options.resource);
	const errorCode = makeErrorCodeFactory(options.resource.name);

	options.builder.addUse('WP_Error');
	options.builder.addUse('WP_REST_Request');
	options.builder.addUse('WP_Term');
	options.builder.addUse('WP_Term_Query');

	return {
		builder: options.builder,
		resource: options.resource,
		storage,
		pascalName,
		identity,
		taxonomy: storage.taxonomy,
		hierarchical: Boolean(storage.hierarchical),
		errorCode,
		titleCaseName: () => pascalName,
	};
}
