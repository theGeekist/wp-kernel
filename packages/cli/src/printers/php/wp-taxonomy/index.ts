import type { IRResource } from '../../../ir';
import type { PrinterContext } from '../../types';
import type { PhpFileBuilder } from '../builder';
import { createWpTaxonomyContext } from './context';
import { buildWpTaxonomyMethods } from './handlers';
import type { WpTaxonomyRouteDefinition } from './types';

export { type WpTaxonomyRouteDefinition } from './types';

export function createWpTaxonomyHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: WpTaxonomyRouteDefinition[];
}): string[][] {
	if (options.resource.storage?.mode !== 'wp-taxonomy') {
		return [];
	}

	const taxonomyContext = createWpTaxonomyContext(options);
	return buildWpTaxonomyMethods(taxonomyContext, options.routes);
}
