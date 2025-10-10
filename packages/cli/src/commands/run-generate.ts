import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createReporter, KernelError } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter } from '@geekist/wp-kernel';
import type * as Prettier from 'prettier';
import { loadKernelConfig } from '../config';
import type {
	AdapterContext,
	KernelConfigV1,
	PhpAdapterConfig,
} from '../config';
import { buildIr } from '../ir';
import type { IRv1 } from '../ir';
import { emitGeneratedArtifacts } from '../printers';
import type { PrinterContext } from '../printers';
import { GENERATED_ROOT } from '../internal';
import { FileWriter, type FileWriterSummary } from '../utils';

type PrettierModule = typeof Prettier;
type PrettierPlugin = Prettier.Plugin;

export type ExitCode = 0 | 1 | 2 | 3;

export interface GenerationSummary extends FileWriterSummary {
	dryRun: boolean;
}

export interface RunGenerateOptions {
	dryRun?: boolean;
	verbose?: boolean;
	reporter?: Reporter;
}

export interface RunGenerateResult {
	exitCode: ExitCode;
	summary?: GenerationSummary;
	output?: string;
	error?: unknown;
}

let prettierPromise: Promise<PrettierModule> | null = null;
let phpPluginPromise: Promise<PrettierPlugin> | null = null;

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

	let loadedConfig!: Awaited<ReturnType<typeof loadKernelConfig>>;
	let ir!: IRv1;
	try {
		loadedConfig = await loadKernelConfig();
		ir = await buildIr({
			config: loadedConfig.config,
			sourcePath: loadedConfig.sourcePath,
			origin: loadedConfig.configOrigin,
			namespace: loadedConfig.namespace,
		});
	} catch (error) {
		const exitCode = handleFailure(error, reporter, 1);
		return { exitCode, error };
	}

	const outputDir = path.resolve(process.cwd(), GENERATED_ROOT);
	const configDirectory = path.dirname(loadedConfig.sourcePath);
	const writer = new FileWriter({ dryRun });

	const adapterContext: AdapterContext = {
		config: loadedConfig.config,
		namespace: ir.meta.sanitizedNamespace,
		reporter: reporter.child('adapter'),
	};

	const ensureDirectory = createEnsureDirectory(dryRun);

	try {
		const phpAdapter = evaluatePhpAdapter(
			loadedConfig.config,
			adapterContext,
			reporter
		);

		const printerContext: PrinterContext = {
			ir,
			outputDir,
			configDirectory,
			formatPhp: (filePath, contents) => formatPhp(contents, filePath),
			formatTs: (filePath, contents) => formatTs(contents, filePath),
			writeFile: async (filePath, contents) => {
				await writer.write(filePath, contents);
			},
			ensureDirectory,
			phpAdapter,
			adapterContext: { ...adapterContext, ir },
		};

		await emitGeneratedArtifacts(printerContext);
	} catch (error) {
		if (error instanceof AdapterEvaluationError) {
			return { exitCode: 3, error: error.original };
		}

		const printerError =
			error instanceof Error ? error : new Error(String(error));
		reportError(reporter, 'Printer failure.', printerError, 'printer');
		return {
			exitCode: 2,
			error: printerError,
		};
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
