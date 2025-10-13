import type { IRResource } from '../../../ir';
import type { PrinterContext } from '../../types';
import type { PhpFileBuilder } from '../builder';
import { createWpPostContext } from './context';
import { buildWpPostMethods } from './handlers';
import type { WpPostRouteDefinition } from './types';

export type { WpPostRouteDefinition } from './types';

export function createWpPostHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: WpPostRouteDefinition[];
}): string[][] {
	if (options.resource.storage?.mode !== 'wp-post') {
		return [];
	}

	const context = createWpPostContext(options);
	return buildWpPostMethods(context, options.routes);
}
