import { PhpFileBuilder } from './builder';
import { appendMethodTemplates } from './builder-helpers';
import { appendGeneratedFileDocblock } from './docblock';
import type { PrinterContext } from '../types';
import type { IRResource, IRRoute } from '../../ir';
import { createMethodTemplate, PHP_INDENT } from './template';
import { toPascalCase, escapeSingleQuotes } from './utils';
import { buildRestArgsPayload } from './rest-args';
import { renderPhpReturn } from './value-renderer';
import { createRouteHandlers } from './routes';

export interface ResourceControllerArtifact {
	builder: PhpFileBuilder;
	className: string;
}

export function createResourceControllerArtifact(
	namespaceRoot: string,
	resource: IRResource,
	routes: IRRoute[],
	context: PrinterContext
): ResourceControllerArtifact {
	const builder = new PhpFileBuilder(`${namespaceRoot}\\Rest`, {
		kind: 'resource-controller',
		name: resource.name,
	});

	appendGeneratedFileDocblock(builder, [
		`Source: ${context.ir.meta.origin} → resources.${resource.name}`,
		`Schema: ${resource.schemaKey} (${resource.schemaProvenance})`,
		...routes.map((route) => `Route: [${route.method}] ${route.path}`),
	]);

	const className = `${toPascalCase(resource.name)}Controller`;
	builder.appendStatement(`class ${className} extends BaseController`);
	builder.appendStatement('{');

	const schema = context.ir.schemas.find(
		(entry) => entry.key === resource.schemaKey
	);

	const methods: string[][] = [
		createMethodTemplate({
			signature: 'public function get_resource_name(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(`return '${escapeSingleQuotes(resource.name)}';`);
			},
		}),
		createMethodTemplate({
			signature: 'public function get_schema_key(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(resource.schemaKey)}';`
				);
			},
		}),
		createMethodTemplate({
			signature: 'public function get_rest_args(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const restArgs = buildRestArgsPayload(schema, resource);
				if (Object.keys(restArgs).length === 0) {
					body.line('return [];');
					return;
				}

				const payloadLines = renderPhpReturn(restArgs, 2);
				payloadLines.forEach((line) => body.raw(line));
			},
		}),
	];

	const routeMethods = createRouteHandlers({
		builder,
		context,
		resource,
		routes,
	});

	methods.push(...routeMethods);

	appendMethodTemplates(builder, methods);
	builder.appendStatement('}');

	return { builder, className };
}
