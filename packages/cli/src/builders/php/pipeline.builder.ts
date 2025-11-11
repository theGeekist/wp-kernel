import { createHelper } from '../../runtime';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import { createPhpProgramWriterHelper } from '@wpkernel/php-json-ast';
import { createPhpBlocksHelper } from './block.artifacts';
import { createPhpBaseControllerHelper } from './controller.base';
import { createPhpChannelHelper } from './pipeline.channel';
import { createPhpCapabilityHelper } from './entry.capabilities';
import { createPhpIndexFileHelper } from './entry.index';
import { createPhpPersistenceRegistryHelper } from './entry.registry';
import { createPhpPluginLoaderHelper } from './entry.plugin';
import {
	createPhpTransientStorageHelper,
	createPhpWpOptionStorageHelper,
	createPhpWpTaxonomyStorageHelper,
} from './storage.artifacts';
import { createPhpWpPostRoutesHelper } from './controller.wpPostRoutes';
import { createPhpResourceControllerHelper } from './controller.resources';
import {
	type CreatePhpBuilderOptions,
	type PhpBuilderApplyOptions,
} from './types';

/**
 * Creates a builder helper for generating PHP code and artifacts.
 *
 * This helper orchestrates a sequence of other PHP-specific helpers to generate
 * various components of the PHP output, such as controllers, storage implementations,
 * capability definitions, and the main plugin loader file.
 *
 * @category AST Builders
 * @param    options - Configuration options for the PHP builder.
 * @returns A `BuilderHelper` instance configured to generate PHP artifacts.
 */
export function createPhpBuilder(
	options: CreatePhpBuilderOptions = {}
): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.core',
		kind: 'builder',
		dependsOn: ['builder.generate.php.driver'],
		async apply(applyOptions: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = applyOptions;
			if (input.phase !== 'generate') {
				reporter.debug('createPhpBuilder: skipping phase.', {
					phase: input.phase,
				});
				await next?.();
				return;
			}

			const helperPipeline = [
				createPhpChannelHelper(),
				createPhpBaseControllerHelper(),
				createPhpTransientStorageHelper(),
				createPhpWpOptionStorageHelper(),
				createPhpWpTaxonomyStorageHelper(),
				createPhpWpPostRoutesHelper(),
				createPhpResourceControllerHelper(),
				createPhpCapabilityHelper(),
				createPhpPersistenceRegistryHelper(),
				createPhpPluginLoaderHelper(),
				createPhpIndexFileHelper(),
				createPhpBlocksHelper(),
				createPhpProgramWriterHelper({
					driver: options.driver,
				}),
			];

			if (!input.ir) {
				throw new WPKernelError('ValidationError', {
					message:
						'createPhpBuilder requires an IR instance during execution.',
				});
			}

			await runHelperSequence(helperPipeline, applyOptions);
			reporter.info('createPhpBuilder: PHP artifacts generated.');
			await next?.();
		},
	});
}

async function runHelperSequence(
	helpers: readonly BuilderHelper[],
	options: PhpBuilderApplyOptions
): Promise<void> {
	const invoke = async (index: number): Promise<void> => {
		const helper = helpers[index];
		if (!helper) {
			return;
		}

		await helper.apply(options, async () => {
			await invoke(index + 1);
		});
	};

	await invoke(0);
}
