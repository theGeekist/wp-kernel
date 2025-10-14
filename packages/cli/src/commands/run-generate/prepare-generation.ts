import path from 'node:path';
import { FileWriter } from '../../utils';
import type {
	AdapterContext,
	AdapterExtension,
	AdapterExtensionFactory,
	KernelConfigV1,
	PhpAdapterConfig,
} from '../../config';
import type { IRv1 } from '../../ir';
import type { PrinterContext } from '../../printers';
import { GENERATED_ROOT } from '../../internal';
import type { Reporter } from '@wpkernel/core/reporter';
import { runAdapterExtensions } from '../../adapters';
import type { AdapterExtensionRunResult } from '../../adapters';
import { formatPhp, formatTs, createEnsureDirectory } from './formatters';
import { reportError } from './reporting';
import type { ExitCode } from './types';
import type { LoadedConfig } from './load-config';
import { AdapterEvaluationError, rollbackExtensions } from './extensions';

export interface PreparationSuccess {
	printerContext: PrinterContext;
	writer: FileWriter;
	extensionsRun?: AdapterExtensionRunResult;
}

export interface PreparationFailure {
	exitCode: ExitCode;
	error?: unknown;
}

export async function prepareGeneration({
	dryRun,
	reporter,
	loadedConfig,
	sourceIr,
}: {
	dryRun: boolean;
	reporter: Reporter;
	loadedConfig: LoadedConfig['loadedConfig'];
	sourceIr: IRv1;
}): Promise<PreparationSuccess | PreparationFailure> {
	const outputDir = path.resolve(process.cwd(), GENERATED_ROOT);
	const configDirectory = path.dirname(loadedConfig.sourcePath);
	const writer = new FileWriter({ dryRun });
	const adapterContext: AdapterContext = {
		config: loadedConfig.config,
		namespace: sourceIr.meta.sanitizedNamespace,
		reporter: reporter.child('adapter'),
		ir: sourceIr,
	};

	const ensureDirectory = createEnsureDirectory(dryRun);

	let extensionsRun: AdapterExtensionRunResult | undefined;
	let effectiveIr = sourceIr;

	try {
		const phpAdapter = evaluatePhpAdapter(
			loadedConfig.config,
			adapterContext,
			reporter
		);

		const extensionsResult = await evaluateAdapterExtensions(
			loadedConfig.config,
			adapterContext,
			{
				ir: sourceIr,
				outputDir,
				configDirectory,
				writer,
				ensureDirectory,
			},
			reporter
		);

		if (extensionsResult instanceof Error) {
			return { exitCode: 3, error: extensionsResult };
		}

		extensionsRun = extensionsResult;
		effectiveIr = extensionsRun?.ir ?? sourceIr;
		adapterContext.ir = effectiveIr;

		const printerContext: PrinterContext = {
			ir: effectiveIr,
			outputDir,
			configDirectory,
			formatPhp: (filePath, contents) => formatPhp(contents, filePath),
			formatTs: (filePath, contents) => formatTs(contents, filePath),
			writeFile: async (filePath, contents) => {
				await writer.write(filePath, contents);
			},
			ensureDirectory,
			phpAdapter,
			adapterContext: { ...adapterContext, ir: effectiveIr },
		};

		return { printerContext, writer, extensionsRun };
	} catch (error) {
		if (extensionsRun) {
			await rollbackExtensions(extensionsRun, reporter);
		}

		if (error instanceof AdapterEvaluationError) {
			return { exitCode: 3, error: error.original };
		}

		const printerError =
			error instanceof Error ? error : new Error(String(error));
		reportError(reporter, 'Printer failure.', printerError, 'printer');
		return { exitCode: 2, error: printerError };
	}
}

async function evaluateAdapterExtensions(
	config: KernelConfigV1,
	adapterContext: AdapterContext,
	options: {
		ir: IRv1;
		outputDir: string;
		configDirectory?: string;
		writer: FileWriter;
		ensureDirectory: (directoryPath: string) => Promise<void>;
	},
	reporter: Reporter
): Promise<AdapterExtensionRunResult | undefined | Error> {
	const factories = getAdapterExtensionFactories(config);
	if (!factories) {
		return undefined;
	}

	const resolved = resolveAdapterExtensions(factories, adapterContext);
	if (resolved instanceof Error) {
		return handleAdapterExtensionError(
			reporter,
			'Adapter extension evaluation failed.',
			resolved
		);
	}

	if (resolved.length === 0) {
		return undefined;
	}

	return runAdapterExtensionsSafely({
		resolved,
		adapterContext,
		options,
		reporter,
	});
}

function getAdapterExtensionFactories(
	config: KernelConfigV1
): AdapterExtensionFactory[] | undefined {
	const factories = config.adapters?.extensions ?? [];
	return factories.length > 0 ? factories : undefined;
}

function handleAdapterExtensionError(
	reporter: Reporter,
	message: string,
	error: Error
): Error {
	reportError(reporter, message, error, 'adapter');
	return error;
}

async function runAdapterExtensionsSafely({
	resolved,
	adapterContext,
	options,
	reporter,
}: {
	resolved: AdapterExtension[];
	adapterContext: AdapterContext;
	options: {
		ir: IRv1;
		outputDir: string;
		configDirectory?: string;
		writer: FileWriter;
		ensureDirectory: (directoryPath: string) => Promise<void>;
	};
	reporter: Reporter;
}): Promise<AdapterExtensionRunResult | Error> {
	try {
		return await runAdapterExtensions({
			extensions: resolved,
			adapterContext,
			ir: options.ir,
			outputDir: options.outputDir,
			configDirectory: options.configDirectory,
			ensureDirectory: options.ensureDirectory,
			writeFile: async (filePath, contents) => {
				await options.writer.write(filePath, contents);
			},
			formatPhp: (filePath, contents) => formatPhp(contents, filePath),
			formatTs: (filePath, contents) => formatTs(contents, filePath),
		});
	} catch (error) {
		const normalised =
			error instanceof Error ? error : new Error(String(error));
		reportError(
			reporter,
			'Adapter extension failure.',
			normalised,
			'adapter'
		);
		return normalised;
	}
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

	return {
		...candidate,
		name,
	};
}

function evaluatePhpAdapter(
	config: KernelConfigV1,
	adapterContext: AdapterContext,
	reporter: Reporter
): PhpAdapterConfig | undefined {
	const factory = config.adapters?.php;
	if (!factory) {
		return undefined;
	}

	try {
		const adapter = factory(adapterContext);
		return adapter ? { ...adapter } : undefined;
	} catch (error) {
		reportError(reporter, 'Adapter evaluation failed.', error, 'adapter');
		const adapterError =
			error instanceof Error ? error : new Error(String(error));
		throw new AdapterEvaluationError(adapterError);
	}
}
