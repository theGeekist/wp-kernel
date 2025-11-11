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
import type { BuildIrOptions } from '../../ir/publicTypes';
import type {
	AdapterContext,
	PhpCodemodAdapterConfig,
} from '../../config/types';
import type { PhpDriverConfigurationOptions } from '@wpkernel/php-json-ast';
import { createPhpCodemodIngestionHelper } from './pipeline.codemods';
import type { CreatePhpCodemodIngestionHelperOptions } from './pipeline.codemods';

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

			const buildOptions = applyOptions.input.options as BuildIrOptions;
			const adapterContext = buildAdapterContext(
				buildOptions,
				applyOptions.input.ir,
				reporter
			);
			const adapterConfig = resolvePhpAdapterConfig(
				buildOptions,
				adapterContext
			);
			const driverOptions = mergeDriverOptions(
				options.driver,
				adapterConfig?.driver
			);
			const codemodHelperOptions = buildCodemodHelperOptions(
				adapterConfig?.codemods,
				driverOptions
			);

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
				...(codemodHelperOptions
					? [createPhpCodemodIngestionHelper(codemodHelperOptions)]
					: []),
				createPhpProgramWriterHelper({
					driver: driverOptions,
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

function resolvePhpAdapterConfig(
	buildOptions: BuildIrOptions,
	adapterContext: AdapterContext | null
) {
	const adapterFactory = buildOptions.config.adapters?.php;
	if (!adapterFactory || !adapterContext) {
		return undefined;
	}

	return adapterFactory(adapterContext) ?? undefined;
}

function buildAdapterContext(
	buildOptions: BuildIrOptions,
	ir: PhpBuilderApplyOptions['input']['ir'],
	reporter: PhpBuilderApplyOptions['reporter']
): AdapterContext | null {
	if (!ir) {
		return null;
	}

	return {
		config: buildOptions.config,
		namespace: buildOptions.namespace,
		reporter,
		ir,
	} satisfies AdapterContext;
}

function mergeDriverOptions(
	base: CreatePhpBuilderOptions['driver'],
	override?: PhpDriverConfigurationOptions
): PhpDriverConfigurationOptions | undefined {
	if (!base && !override) {
		return undefined;
	}

	type MutableDriverOptions = {
		binary?: string;
		scriptPath?: string;
		importMetaUrl?: string;
	};

	const merged: MutableDriverOptions = {};
	const keys: ReadonlyArray<keyof MutableDriverOptions> = [
		'binary',
		'scriptPath',
		'importMetaUrl',
	];

	for (const source of [base, override]) {
		if (!source) {
			continue;
		}

		for (const key of keys) {
			const value = source[key];
			if (typeof value === 'string' && value.length > 0) {
				merged[key] = value;
			}
		}
	}

	return Object.keys(merged).length > 0
		? (merged as PhpDriverConfigurationOptions)
		: undefined;
}

function buildCodemodHelperOptions(
	codemods: PhpCodemodAdapterConfig | undefined,
	driver: PhpDriverConfigurationOptions | undefined
): CreatePhpCodemodIngestionHelperOptions | null {
	if (!codemods) {
		return null;
	}

	const files = codemods.files.filter((file) => typeof file === 'string');
	if (files.length === 0) {
		return null;
	}

	return {
		files,
		configurationPath: codemods.configurationPath,
		enableDiagnostics: codemods.diagnostics?.nodeDumps === true,
		phpBinary: codemods.driver?.binary ?? driver?.binary,
		scriptPath: codemods.driver?.scriptPath,
		importMetaUrl: codemods.driver?.importMetaUrl,
	} satisfies CreatePhpCodemodIngestionHelperOptions;
}
