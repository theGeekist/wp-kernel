import { PhpFileBuilder } from './builder';
import { appendMethodTemplates } from './builder-helpers';
import { appendGeneratedFileDocblock } from './docblock';
import type { PrinterContext } from '../types';
import { createMethodTemplate, PHP_INDENT } from './template';
import { escapeSingleQuotes } from './utils';

export function createBaseControllerBuilder(
	namespaceRoot: string,
	context: PrinterContext
): PhpFileBuilder {
	const builder = new PhpFileBuilder(`${namespaceRoot}\\Rest`, {
		kind: 'base-controller',
	});

	appendGeneratedFileDocblock(builder, [
		`Source: ${context.ir.meta.origin} → resources (namespace: ${context.ir.meta.sanitizedNamespace})`,
	]);

	builder.appendStatement('abstract class BaseController');
	builder.appendStatement('{');

	const methods = [
		createMethodTemplate({
			signature: 'public function get_namespace(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(context.ir.meta.sanitizedNamespace)}';`
				);
			},
		}),
	];

	appendMethodTemplates(builder, methods);

	builder.appendStatement('}');

	return builder;
}
