import { PhpFileBuilder } from './builder';
import { appendMethodTemplates } from './builder-helpers';
import { appendGeneratedFileDocblock } from './docblock';
import type { PrinterContext } from '../types';
import { assembleMethodTemplate, PHP_INDENT } from './template';
import { sanitizeJson } from './utils';
import { renderPhpReturn } from './value-renderer';

export function createPersistenceRegistryBuilder(
	namespaceRoot: string,
	context: PrinterContext
): PhpFileBuilder {
	const builder = new PhpFileBuilder(`${namespaceRoot}\\Registration`, {
		kind: 'persistence-registry',
	});

	appendGeneratedFileDocblock(builder, [
		`Source: ${context.ir.meta.origin} → resources (storage + identity metadata)`,
	]);

	builder.appendStatement('final class PersistenceRegistry');
	builder.appendStatement('{');

	const methods = [
		assembleMethodTemplate({
			signature: 'public static function get_config(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const payload = buildPersistencePayload(context);
				const payloadLines = renderPhpReturn(payload, 2);
				payloadLines.forEach((line) => body.raw(line));
			},
		}),
	];

	appendMethodTemplates(builder, methods);
	builder.appendStatement('}');

	return builder;
}

function buildPersistencePayload(
	context: PrinterContext
): Record<string, unknown> {
	const resources: Record<string, unknown> = {};

	for (const resource of context.ir.resources) {
		if (!resource.storage && !resource.identity) {
			continue;
		}

		resources[resource.name] = sanitizeJson({
			storage: resource.storage ?? null,
			identity: resource.identity ?? null,
		});
	}

	return { resources };
}
