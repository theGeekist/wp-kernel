import { createHelper } from '../../runtime';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import type { PhpDriverConfigurationOptions } from '@wpkernel/php-json-ast';
import {
	createPhpBaseControllerHelper,
	createPhpChannelHelper,
	createPhpBlocksHelper,
	createPhpIndexFileHelper,
	createPhpPersistenceRegistryHelper,
	createPhpCapabilityHelper,
	createPhpPluginLoaderHelper,
	createPhpProgramWriterHelper,
	createPhpTransientStorageHelper,
	createPhpWpOptionStorageHelper,
	createPhpWpTaxonomyStorageHelper,
	createPhpWpPostRoutesHelper,
	createPhpResourceControllerHelper,
} from './printers';

export type { PhpDriverConfigurationOptions } from '@wpkernel/php-json-ast';

export interface CreatePhpBuilderOptions {
	/**
	 * Optional configuration options for the PHP driver.
	 */
	readonly driver?: PhpDriverConfigurationOptions;
}

/**
 * Creates a builder helper for generating PHP code and artifacts.
 *
 * This helper orchestrates a sequence of other PHP-specific helpers to generate
 * various components of the PHP output, such as controllers, storage implementations,
 * capability definitions, and the main plugin loader file.
 *
 * @category PHP Builder
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

type PhpBuilderApplyOptions = BuilderApplyOptions;

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
