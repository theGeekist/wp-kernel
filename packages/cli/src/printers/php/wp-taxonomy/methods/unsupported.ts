import { createMethodTemplate, PHP_INDENT } from '../../template';
import { escapeSingleQuotes } from '../../utils';
import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from '../types';

export function createUnsupportedMethod(
	context: WpTaxonomyContext,
	definition: WpTaxonomyRouteDefinition
): string[] {
	return createMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(
				`return new WP_Error( '${context.errorCode('unsupported_operation')}', '${escapeSingleQuotes(`Operation not supported for ${context.titleCaseName()} taxonomy.`)}', array( 'status' => 501 ) );`
			);
		},
	});
}
