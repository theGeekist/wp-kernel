import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	appendGeneratedFileDocblock,
	buildPersistenceRegistryDocblock,
	createWpPhpFileBuilder,
} from '@wpkernel/wp-json-ast';
import {
	buildClass,
	buildClassMethod,
	buildIdentifier,
	buildReturn,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpAstBuilderAdapter,
} from '@wpkernel/php-json-ast';
import type { IRResource, IRv1 } from '../../ir/publicTypes';
import { renderPhpValue } from './resource/phpValue';
import { sanitizeJson } from './utils';

export function createPhpPersistenceRegistryHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.registration.persistence',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;
			const namespace = `${ir.php.namespace}\\Generated\\Registration`;
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Registration',
				'PersistenceRegistry.php'
			);

			const helper = createWpPhpFileBuilder<
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
	appendGeneratedFileDocblock(
		builder,
		buildPersistenceRegistryDocblock({ origin: ir.meta.origin })
	);

	const payload = buildPersistencePayload(ir.resources);
	const method = buildClassMethod(buildIdentifier('get_config'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(renderPhpValue(payload))],
	});

	const classNode = buildClass(buildIdentifier('PersistenceRegistry'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: [method],
	});

	builder.appendProgramStatement(classNode);
}

export function buildPersistencePayload(
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
