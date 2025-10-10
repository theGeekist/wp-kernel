import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Command, Option } from 'clipanion';
import { createReporter, KernelError } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter } from '@geekist/wp-kernel';
import { loadKernelConfig } from '../config';
import type {
	AdapterContext,
	AdapterExtensionFactory,
	KernelConfigV1,
	PhpAdapterConfig,
} from '../config';
import { buildIr } from '../ir';
import type { IRv1 } from '../ir';
import { emitGeneratedArtifacts } from '../printers';
import type { PrinterContext } from '../printers';
import { FileWriter, type FileWriterSummary } from '../utils';
import { GENERATED_ROOT } from '../internal';
import type * as Prettier from 'prettier';
import { runAdapterExtensions } from '../adapters';
import type { AdapterExtension, AdapterExtensionRunResult } from '../adapters';

type PrettierModule = typeof Prettier;
type PrettierPlugin = Prettier.Plugin;

type ExitCode = 0 | 1 | 2 | 3;

interface GenerationSummary extends FileWriterSummary {
	dryRun: boolean;
}

let prettierPromise: Promise<PrettierModule> | null = null;
let phpPluginPromise: Promise<PrettierPlugin> | null = null;

export class GenerateCommand extends Command {
	static override paths = [['generate']];

	static override usage = Command.Usage({
		description: 'Generate WP Kernel artifacts from kernel.config.*.',
		examples: [
			['Generate artifacts into .generated/', 'wpk generate'],
			['Preview changes without writing files', 'wpk generate --dry-run'],
			[
				'Verbose logging including per-file status',
				'wpk generate --verbose',
			],
		],
	});

	dryRun = Option.Boolean('--dry-run', false);
	verbose = Option.Boolean('--verbose', false);

	public summary?: GenerationSummary;

	override async execute(): Promise<ExitCode> {
		const reporter = this.createReporter();

		const preparation = await this.prepareGeneration(reporter);
		if (typeof preparation === 'number') {
			return preparation;
		}

		const { printerContext, writer, extensionsRun } = preparation;

		const printerResult = await this.runPrinters(
			printerContext,
			extensionsRun,
			reporter
		);
		if (printerResult !== null) {
			return printerResult;
		}

		const commitResult = await this.commitExtensions(
			extensionsRun,
			reporter
		);
		if (commitResult !== null) {
			return commitResult;
		}

		this.finaliseGeneration(writer, reporter);

		return 0;
	}

	private createReporter(): Reporter {
		return createReporter({
			namespace: `${WPK_NAMESPACE}.cli.generate`,
			level: this.verbose ? 'debug' : 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});
	}

	private finaliseGeneration(writer: FileWriter, reporter: Reporter): void {
		const summary = writer.summarise();
		this.summary = { ...summary, dryRun: this.dryRun };

		reporter.info('Generation completed.', {
			dryRun: this.dryRun,
			counts: summary.counts,
		});

		if (this.verbose) {
			reporter.debug('Generated files.', { files: summary.entries });
		}

		this.context.stdout.write(this.renderSummary(summary, this.dryRun));
	}

	private async runPrinters(
		printerContext: PrinterContext,
		extensionsRun: AdapterExtensionRunResult | undefined,
		reporter: Reporter
	): Promise<ExitCode | null> {
		try {
			await emitGeneratedArtifacts(printerContext);
			return null;
		} catch (error) {
			if (extensionsRun) {
				await this.rollbackExtensions(extensionsRun, reporter);
			}
			this.reportError(reporter, 'Printer failure.', error);
			return 2;
		}
	}

	private evaluatePhpAdapter(
		config: KernelConfigV1,
		adapterContext: AdapterContext,
		reporter: Reporter
	): PhpAdapterConfig | undefined | Error {
		const factory = config.adapters?.php;
		if (!factory) {
			return undefined;
		}

		try {
			const adapter = factory(adapterContext);
			return adapter ? { ...adapter } : undefined;
		} catch (error) {
			this.reportError(
				reporter,
				'Adapter evaluation failed.',
				error,
				'adapter'
			);
			return error instanceof Error ? error : new Error(String(error));
		}
	}

	private async evaluateAdapterExtensions(
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
		const factories = this.getAdapterExtensionFactories(config);
		if (!factories) {
			return undefined;
		}

		const resolved = this.resolveAdapterExtensions(
			factories,
			adapterContext
		);
		if (resolved instanceof Error) {
			return this.handleAdapterExtensionError(
				reporter,
				'Adapter extension evaluation failed.',
				resolved
			);
		}

		if (resolved.length === 0) {
			return undefined;
		}

		return this.runAdapterExtensionsSafely({
			resolved,
			adapterContext,
			options,
			reporter,
		});
	}

	private getAdapterExtensionFactories(
		config: KernelConfigV1
	): AdapterExtensionFactory[] | undefined {
		const factories = config.adapters?.extensions ?? [];
		return factories.length > 0 ? factories : undefined;
	}

	private handleAdapterExtensionError(
		reporter: Reporter,
		message: string,
		error: Error
	): Error {
		this.reportError(reporter, message, error, 'adapter');
		return error;
	}

	private async runAdapterExtensionsSafely({
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
				formatPhp: (filePath, contents) =>
					this.formatPhp(contents, filePath),
				formatTs: (filePath, contents) =>
					this.formatTs(contents, filePath),
			});
		} catch (error) {
			const normalised =
				error instanceof Error ? error : new Error(String(error));
			this.reportError(
				reporter,
				'Adapter extension failure.',
				normalised,
				'adapter'
			);
			return normalised;
		}
	}

	private async rollbackExtensions(
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
					this.serialiseError(error)
				);
		}
	}

	private async commitExtensions(
		extensionsRun: AdapterExtensionRunResult | undefined,
		reporter: Reporter
	): Promise<ExitCode | null> {
		if (!extensionsRun) {
			return null;
		}

		try {
			await extensionsRun.commit();
			return null;
		} catch (error) {
			await this.rollbackExtensions(extensionsRun, reporter);
			this.reportError(
				reporter,
				'Adapter extension commit failed.',
				error,
				'adapter'
			);
			return 3;
		}
	}

	private resolveAdapterExtensions(
		factories: AdapterExtensionFactory[],
		adapterContext: AdapterContext
	): AdapterExtension[] | Error {
		const extensions: AdapterExtension[] = [];

		for (const factory of factories) {
			const produced = this.invokeExtensionFactory(
				factory,
				adapterContext
			);
			if (produced instanceof Error) {
				return produced;
			}

			if (!produced) {
				continue;
			}

			for (const candidate of produced) {
				const validated = this.validateExtension(candidate);
				if (validated instanceof Error) {
					return validated;
				}

				extensions.push(validated);
			}
		}

		return extensions;
	}

	private invokeExtensionFactory(
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

	private validateExtension(
		candidate: AdapterExtension | undefined | null
	): AdapterExtension | Error {
		if (!candidate) {
			return new Error(
				'Invalid adapter extension returned from factory.'
			);
		}

		const name =
			typeof candidate.name === 'string' ? candidate.name.trim() : '';
		if (!name) {
			return new Error(
				'Adapter extensions must provide a non-empty name.'
			);
		}

		if (typeof candidate.apply !== 'function') {
			return new Error(
				'Adapter extensions must define an apply() function.'
			);
		}

		return {
			...candidate,
			name,
		};
	}

	private async loadConfigAndIr(reporter: Reporter): Promise<
		| {
				loadedConfig: Awaited<ReturnType<typeof loadKernelConfig>>;
				ir: IRv1;
		  }
		| ExitCode
	> {
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
			return this.handleFailure(error, reporter, 1);
		}
	}

	private async prepareGeneration(reporter: Reporter): Promise<
		| ExitCode
		| {
				printerContext: PrinterContext;
				writer: FileWriter;
				extensionsRun?: AdapterExtensionRunResult;
		  }
	> {
		const configResult = await this.loadConfigAndIr(reporter);
		if (typeof configResult === 'number') {
			return configResult;
		}

		const { loadedConfig, ir } = configResult;

		const outputDir = path.resolve(process.cwd(), GENERATED_ROOT);
		const configDirectory = path.dirname(loadedConfig.sourcePath);
		const writer = new FileWriter({ dryRun: this.dryRun });

		const adapterContext: AdapterContext = {
			config: loadedConfig.config,
			namespace: ir.meta.sanitizedNamespace,
			reporter: reporter.child('adapter'),
			ir,
		};

		const ensureDirectory = async (directoryPath: string) => {
			if (!this.dryRun) {
				await fs.mkdir(directoryPath, { recursive: true });
			}
		};

		const phpAdapter = this.evaluatePhpAdapter(
			loadedConfig.config,
			adapterContext,
			reporter
		);
		if (phpAdapter instanceof Error) {
			return 3;
		}

		const extensionsRun = await this.evaluateAdapterExtensions(
			loadedConfig.config,
			adapterContext,
			{
				ir,
				outputDir,
				configDirectory,
				writer,
				ensureDirectory,
			},
			reporter
		);

		if (extensionsRun instanceof Error) {
			return 3;
		}

		const effectiveIr = extensionsRun?.ir ?? ir;
		adapterContext.ir = effectiveIr;

		const printerContext: PrinterContext = {
			ir: effectiveIr,
			outputDir,
			configDirectory,
			formatPhp: (filePath, contents) =>
				this.formatPhp(contents, filePath),
			formatTs: (filePath, contents) => this.formatTs(contents, filePath),
			writeFile: async (filePath, contents) => {
				await writer.write(filePath, contents);
			},
			ensureDirectory,
			phpAdapter,
			adapterContext: { ...adapterContext, ir: effectiveIr },
		};

		return { printerContext, writer, extensionsRun };
	}

	private handleFailure(
		error: unknown,
		reporter: Reporter,
		fallbackCode: ExitCode
	): ExitCode {
		this.reportError(reporter, 'Generation failed.', error);

		if (
			KernelError.isKernelError(error) &&
			(error.code === 'ValidationError' ||
				error.code === 'DeveloperError')
		) {
			return 1;
		}

		return fallbackCode;
	}

	private reportError(
		reporter: Reporter,
		message: string,
		error: unknown,
		channel: 'adapter' | 'printer' | 'runtime' = 'runtime'
	): void {
		const serialised = this.serialiseError(error);
		reporter.child(channel).error(message, serialised);
	}

	private serialiseError(error: unknown): Record<string, unknown> {
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

	private async formatTs(
		contents: string,
		filePath: string
	): Promise<string> {
		const prettier = await this.loadPrettier();
		const formatted = await prettier.format(contents, {
			filepath: filePath,
		});
		return ensureTrailingNewline(formatted);
	}

	private async formatPhp(
		contents: string,
		filePath: string
	): Promise<string> {
		if (!phpPluginPromise) {
			phpPluginPromise = import('@prettier/plugin-php').then(
				(mod) => (mod.default ?? mod) as PrettierPlugin
			);
		}

		const prettier = await this.loadPrettier();
		const plugin = await phpPluginPromise;
		const formatted = await prettier.format(contents, {
			filepath: filePath,
			parser: 'php',
			plugins: [plugin],
		});
		return ensureTrailingNewline(formatted);
	}

	private async loadPrettier(): Promise<PrettierModule> {
		if (!prettierPromise) {
			prettierPromise = import('prettier').then(
				(mod) => mod as PrettierModule
			);
		}

		return prettierPromise;
	}

	private renderSummary(summary: FileWriterSummary, dryRun: boolean): string {
		const parts: string[] = [];
		parts.push('\n[wpk] generate summary');
		parts.push(
			`  mode: ${dryRun ? 'dry-run' : 'write'} | written=${summary.counts.written}` +
				` unchanged=${summary.counts.unchanged}` +
				` skipped=${summary.counts.skipped}`
		);

		if (this.verbose && summary.entries.length > 0) {
			parts.push('  files:');
			for (const entry of summary.entries) {
				parts.push(`    - ${entry.status.padEnd(9)} ${entry.path}`);
			}
		}

		parts.push('\n');
		return parts.join('\n');
	}
}

function ensureTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}
