import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createReporter, KernelError } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter } from '@geekist/wp-kernel';
import type * as Prettier from 'prettier';
import { loadKernelConfig } from '../config';
import type {
	AdapterContext,
	AdapterExtension,
	AdapterExtensionFactory,
	KernelConfigV1,
	PhpAdapterConfig,
} from '../config';
import { buildIr } from '../ir';
import type { IRv1 } from '../ir';
import { emitGeneratedArtifacts } from '../printers';
import type { PrinterContext } from '../printers';
import { GENERATED_ROOT } from '../internal';
import { FileWriter, type FileWriterSummary } from '../utils';
import { runAdapterExtensions } from '../adapters';
import type { AdapterExtensionRunResult } from '../adapters';

type PrettierModule = typeof Prettier;
type PrettierPlugin = Prettier.Plugin;

/**
 * Exit codes produced by the runGenerate helper.
 */
export type ExitCode = 0 | 1 | 2 | 3;

/**
 * Aggregated summary returned after generating artifacts.
 */
export interface GenerationSummary extends FileWriterSummary {
	dryRun: boolean;
}

/**
 * Options controlling runGenerate behaviour.
 */
export interface RunGenerateOptions {
	dryRun?: boolean;
	verbose?: boolean;
	reporter?: Reporter;
}

/**
 * Result returned from runGenerate.
 */
export interface RunGenerateResult {
	exitCode: ExitCode;
	summary?: GenerationSummary;
	output?: string;
	error?: unknown;
}

let prettierPromise: Promise<PrettierModule> | null = null;
let phpPluginPromise: Promise<PrettierPlugin> | null = null;

/**
 * Execute the artifact generation workflow.
 *
 * Loads kernel config, builds the IR, runs printers, executes adapter
 * extensions and returns a structured summary including CLI-friendly output.
 * @param options
 */
export async function runGenerate(
	options: RunGenerateOptions = {}
): Promise<RunGenerateResult> {
	const { dryRun = false, verbose = false } = options;
	const reporter =
		options.reporter ??
		createReporter({
			namespace: `${WPK_NAMESPACE}.cli.generate`,
			level: verbose ? 'debug' : 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

	const configResult = await loadConfigAndIr(reporter);
	if ('exitCode' in configResult) {
		return configResult;
	}

	const preparation = await prepareGeneration({
		dryRun,
		reporter,
		loadedConfig: configResult.loadedConfig,
		sourceIr: configResult.ir,
	});

	if ('exitCode' in preparation) {
		return preparation;
	}

	const { printerContext, writer, extensionsRun } = preparation;
	const printerResult = await runPrinters(
		printerContext,
		extensionsRun,
		reporter
	);
	if (printerResult) {
		return printerResult;
	}

	const commitError = await commitExtensions(extensionsRun, reporter);
	if (commitError) {
		return { exitCode: 3, error: commitError };
	}

	const summary = writer.summarise();
	const generationSummary: GenerationSummary = { ...summary, dryRun };

	reporter.info('Generation completed.', {
		dryRun,
		counts: summary.counts,
	});

	reporter.debug('Generated files.', { files: summary.entries });

	return {
		exitCode: 0,
		summary: generationSummary,
		output: renderSummary(summary, dryRun, verbose),
	};
}

type LoadConfigSuccess = {
	loadedConfig: Awaited<ReturnType<typeof loadKernelConfig>>;
	ir: IRv1;
};

type LoadConfigFailure = {
	exitCode: ExitCode;
	error: unknown;
};

async function loadConfigAndIr(
	reporter: Reporter
): Promise<LoadConfigSuccess | LoadConfigFailure> {
	try {
		const loadedConfig = await loadKernelConfig();
		const ir = await buildIr({
			config: loadedConfig.config,
			sourcePath: loadedConfig.sourcePath,
			origin: loadedConfig.configOrigin,
			namespace: loadedConfig.namespace,
		});

		return { loadedConfig, ir };
	} catch (error) {
		const exitCode = handleFailure(error, reporter, 1);
		return { exitCode, error };
	}
}

type PreparationSuccess = {
	printerContext: PrinterContext;
	writer: FileWriter;
	extensionsRun?: AdapterExtensionRunResult;
};

type PreparationFailure = {
	exitCode: ExitCode;
	error?: unknown;
};

async function prepareGeneration({
	dryRun,
	reporter,
	loadedConfig,
	sourceIr,
}: {
	dryRun: boolean;
	reporter: Reporter;
	loadedConfig: Awaited<ReturnType<typeof loadKernelConfig>>;
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

type PrinterRunResult = RunGenerateResult | null;

async function runPrinters(
	printerContext: PrinterContext,
	extensionsRun: AdapterExtensionRunResult | undefined,
	reporter: Reporter
): Promise<PrinterRunResult> {
	try {
		await emitGeneratedArtifacts(printerContext);
		return null;
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

function handleFailure(
	error: unknown,
	reporter: Reporter,
	fallbackCode: ExitCode
): ExitCode {
	reportError(reporter, 'Generation failed.', error);

	if (
		KernelError.isKernelError(error) &&
		(error.code === 'ValidationError' || error.code === 'DeveloperError')
	) {
		return 1;
	}

	return fallbackCode;
}

function reportError(
	reporter: Reporter,
	message: string,
	error: unknown,
	channel: 'adapter' | 'printer' | 'runtime' = 'runtime'
): void {
	const serialised = serialiseError(error);
	reporter.child(channel).error(message, serialised);
}

/**
 * Serialise unknown errors into JSON-safe payloads for logging.
 * @param error
 */
function serialiseError(error: unknown): Record<string, unknown> {
	if (KernelError.isKernelError(error)) {
		return {
			code: error.code,
			message: error.message,
			context: error.context,
			data: error.data,
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return { value: error };
}

async function commitExtensions(
	extensionsRun: AdapterExtensionRunResult | undefined,
	reporter: Reporter
): Promise<Error | undefined> {
	if (!extensionsRun) {
		return undefined;
	}

	try {
		await extensionsRun.commit();
		return undefined;
	} catch (error) {
		await rollbackExtensions(extensionsRun, reporter);
		const normalised =
			error instanceof Error ? error : new Error(String(error));
		reportError(
			reporter,
			'Adapter extension commit failed.',
			normalised,
			'adapter'
		);
		return normalised;
	}
}

async function rollbackExtensions(
	extensionsRun: AdapterExtensionRunResult,
	reporter: Reporter
): Promise<void> {
	try {
		await extensionsRun.rollback();
	} catch (error) {
		reporter
			.child('adapter')
			.warn(
				'Failed to rollback adapter extensions.',
				serialiseError(error)
			);
	}
}

async function formatTs(contents: string, filePath: string): Promise<string> {
	const prettier = await loadPrettier();
	const formatted = await prettier.format(contents, {
		filepath: filePath,
	});
	return ensureTrailingNewline(formatted);
}

async function formatPhp(contents: string, filePath: string): Promise<string> {
	if (!phpPluginPromise) {
		phpPluginPromise = import('@prettier/plugin-php').then(
			(mod) => (mod.default ?? mod) as PrettierPlugin
		);
	}

	const prettier = await loadPrettier();
	const plugin = await phpPluginPromise;
	const formatted = await prettier.format(contents, {
		filepath: filePath,
		parser: 'php',
		plugins: [plugin],
	});
	return ensureTrailingNewline(formatted);
}

async function loadPrettier(): Promise<PrettierModule> {
	if (!prettierPromise) {
		prettierPromise = import('prettier').then(
			(mod) => mod as PrettierModule
		);
	}

	return prettierPromise;
}

function renderSummary(
	summary: FileWriterSummary,
	dryRun: boolean,
	verbose: boolean
): string {
	const parts: string[] = [];
	parts.push('\n[wpk] generate summary');
	parts.push(
		`  mode: ${dryRun ? 'dry-run' : 'write'} | written=${summary.counts.written}` +
			` unchanged=${summary.counts.unchanged}` +
			` skipped=${summary.counts.skipped}`
	);

	if (verbose && summary.entries.length > 0) {
		parts.push('  files:');
		for (const entry of summary.entries) {
			parts.push(`    - ${entry.status.padEnd(9)} ${entry.path}`);
		}
	}

	parts.push('\n');
	return parts.join('\n');
}

function ensureTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}

export { serialiseError };

function createEnsureDirectory(
	dryRun: boolean
): PrinterContext['ensureDirectory'] {
	if (dryRun) {
		return async () => undefined;
	}

	return async (directoryPath: string) => {
		await fs.mkdir(directoryPath, { recursive: true });
	};
}

class AdapterEvaluationError extends Error {
	constructor(public readonly original: Error) {
		super(original.message);
		this.name = 'AdapterEvaluationError';
		this.stack = original.stack;
	}
}
