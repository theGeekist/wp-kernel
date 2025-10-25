import fs from 'node:fs/promises';
import path from 'node:path';
import { KernelError } from '@wpkernel/core/error';
import { runAdapterExtensions } from '../../adapters';
import type {
	AdapterContext,
	AdapterExtension,
	AdapterExtensionFactory,
} from '../../config/types';
import { GENERATED_ROOT } from '../../internal';
import type {
	PipelineExtension,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
} from './types';
import { buildTsFormatter } from '../builders/ts';

function invokeExtensionFactory(
	factory: AdapterExtensionFactory,
	adapterContext: AdapterContext
): AdapterExtension[] | undefined | Error {
	try {
		const produced = factory(adapterContext);
		if (!produced) {
			return undefined;
		}

		return Array.isArray(produced) ? produced : [produced];
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
}

function validateExtension(
	candidate: AdapterExtension | undefined | null
): AdapterExtension | Error {
	if (!candidate) {
		return new Error('Invalid adapter extension returned from factory.');
	}

	const name =
		typeof candidate.name === 'string' ? candidate.name.trim() : '';
	if (!name) {
		return new Error('Adapter extensions must provide a non-empty name.');
	}

	if (typeof candidate.apply !== 'function') {
		return new Error('Adapter extensions must define an apply() function.');
	}

	return { ...candidate, name };
}

function resolveAdapterExtensions(
	factories: AdapterExtensionFactory[],
	adapterContext: AdapterContext
): AdapterExtension[] | Error {
	const extensions: AdapterExtension[] = [];

	for (const factory of factories) {
		const produced = invokeExtensionFactory(factory, adapterContext);
		if (produced instanceof Error) {
			return produced;
		}

		if (!produced) {
			continue;
		}

		for (const candidate of produced) {
			const validated = validateExtension(candidate);
			if (validated instanceof Error) {
				return validated;
			}

			extensions.push(validated);
		}
	}

	return extensions;
}

async function ensureDirectory(
	workspaceRoot: string,
	directoryPath: string
): Promise<void> {
	const absolute = path.isAbsolute(directoryPath)
		? directoryPath
		: path.resolve(workspaceRoot, directoryPath);
	await fs.mkdir(absolute, { recursive: true });
}

async function runExtensions(
	options: PipelineExtensionHookOptions
): Promise<PipelineExtensionHookResult | void> {
	if (options.context.phase !== 'generate') {
		return undefined;
	}

	const factories = options.options.config.adapters?.extensions ?? [];
	if (factories.length === 0) {
		return undefined;
	}

	const adapterReporter = options.context.reporter.child('adapter');
	const adapterContext: AdapterContext = {
		config: options.options.config,
		reporter: adapterReporter,
		namespace: options.artifact.meta.sanitizedNamespace,
		ir: options.artifact,
	};

	const resolved = resolveAdapterExtensions(factories, adapterContext);
	if (resolved instanceof Error) {
		adapterReporter.error('Adapter extensions failed to initialise.', {
			error: resolved.message,
		});
		throw new KernelError('DeveloperError', {
			message: 'Adapter extensions failed to initialise.',
			data: { message: resolved.message },
		});
	}

	if (resolved.length === 0) {
		return undefined;
	}

	adapterReporter.info('Running adapter extensions.', {
		count: resolved.length,
	});

	const workspaceRoot = options.context.workspace.root;
	const outputDir = options.context.workspace.resolve(GENERATED_ROOT);
	const configDirectory = path.dirname(options.options.sourcePath);

	const tsFormatter = buildTsFormatter();

	const runResult = await runAdapterExtensions({
		extensions: resolved,
		adapterContext,
		ir: options.artifact,
		outputDir,
		configDirectory,
		ensureDirectory: async (directoryPath) => {
			await ensureDirectory(workspaceRoot, directoryPath);
		},
		writeFile: async (filePath, contents) => {
			await options.context.workspace.write(filePath, contents, {
				ensureDir: true,
			});
		},
		formatPhp: async (_filePath, contents) => contents,
		formatTs: (filePath, contents) =>
			tsFormatter.format({ filePath, contents }),
	});

	adapterContext.ir = runResult.ir;

	adapterReporter.info('Adapter extensions completed successfully.', {
		count: resolved.length,
	});

	return {
		artifact: runResult.ir,
		commit: runResult.commit,
		rollback: runResult.rollback,
	};
}

export function buildAdapterExtensionsExtension(): PipelineExtension {
	return {
		key: 'pipeline.extensions.adapters',
		register() {
			return (options) => runExtensions(options);
		},
	};
}
