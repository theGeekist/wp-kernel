import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import {
	buildPersistenceRegistryModule,
	type PersistenceRegistryResourceConfig,
} from '@wpkernel/wp-json-ast';
import type { IRv1 } from '../../ir/publicTypes';
import { getPhpBuilderChannel } from './channel';

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
			const module = buildPersistenceRegistryModule({
				origin: ir.meta.origin,
				namespace,
				resources: mapResources(ir),
			});

			const channel = getPhpBuilderChannel(options.context);
			for (const file of module.files) {
				const filePath = options.context.workspace.resolve(
					ir.php.outputDir,
					file.fileName
				);

				channel.queue({
					file: filePath,
					program: file.program,
					metadata: file.metadata,
					docblock: file.docblock,
					uses: file.uses,
					statements: file.statements,
				});
			}

			await next?.();
		},
	});
}

function mapResources(ir: IRv1): readonly PersistenceRegistryResourceConfig[] {
	return ir.resources.map((resource) => ({
		name: resource.name,
		storage: resource.storage ?? null,
		identity: resource.identity ?? null,
	}));
}
