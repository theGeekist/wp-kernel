import { assembleMethodTemplate, PHP_INDENT } from '../template';
import type { WpPostContext } from './context';
import type { WpPostRouteDefinition } from './types';

export function createStubMethod(
	context: WpPostContext,
	definition: WpPostRouteDefinition
): string[] {
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			if (definition.route.path.includes(`:${context.identity.param}`)) {
				body.line(
					`$${context.identity.param} = $request->get_param( '${context.identity.param}' );`
				);
				body.blank();
			}

			body.line(
				`// TODO: Implement handler for [${definition.route.method}] ${definition.route.path}.`
			);
			body.line("return new WP_Error( 501, 'Not Implemented' );");
		},
	});
}
