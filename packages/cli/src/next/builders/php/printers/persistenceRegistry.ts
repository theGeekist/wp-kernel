import { createHelper } from '../../../helper';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import {
	createPhpFileBuilder,
	type PhpAstBuilderAdapter,
} from '@wpkernel/php-json-ast/builders';
import {
	appendGeneratedFileDocblock,
	appendClassTemplate,
	createPhpReturn,
	sanitizeJson,
} from '@wpkernel/php-json-ast';
import {
	createClassTemplate,
	createMethodTemplate,
	PHP_INDENT,
} from '@wpkernel/php-json-ast/templates';
import { createIdentifier } from '@wpkernel/php-json-ast/nodes';
import {
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
} from '@wpkernel/php-json-ast/modifiers';
import type { IRResource, IRv1 } from '../../../../ir/types';

export function createPhpPersistenceRegistryHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.registration.persistence',
		kind: 'builder',
		async apply(options, next) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;
			const namespace = `${ir.php.namespace}\\Registration`;
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Registration',
				'PersistenceRegistry.php'
			);

			const helper = createPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'persistence-registry',
				filePath,
				namespace,
				metadata: { kind: 'persistence-registry' },
				build: (builder) => buildPersistenceRegistry(builder, ir),
			});

			await helper.apply(options);
			await next?.();
		},
	});
}

function buildPersistenceRegistry(
	builder: PhpAstBuilderAdapter,
	ir: IRv1
): void {
	appendGeneratedFileDocblock(builder, [
		`Source: ${ir.meta.origin} → resources (storage + identity metadata)`,
	]);

	const payload = buildPersistencePayload(ir.resources);

	const methods = [
		createMethodTemplate({
			signature: 'public static function get_config(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const printable = createPhpReturn(payload, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: createIdentifier('array'),
			},
		}),
	];

	const classTemplate = createClassTemplate({
		name: 'PersistenceRegistry',
		flags: PHP_CLASS_MODIFIER_FINAL,
		methods,
	});

	appendClassTemplate(builder, classTemplate);
}

function buildPersistencePayload(
	resources: readonly IRResource[]
): Record<string, unknown> {
	const entries: Record<string, unknown> = {};

	for (const resource of resources) {
		if (!resource.storage && !resource.identity) {
			continue;
		}

		entries[resource.name] = sanitizeJson({
			storage: resource.storage ?? null,
			identity: resource.identity ?? null,
		});
	}

	return { resources: entries };
}
