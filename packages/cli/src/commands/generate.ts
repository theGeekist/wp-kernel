import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Command, Option } from 'clipanion';
import { createReporter, KernelError } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type { Reporter } from '@geekist/wp-kernel';
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
import { FileWriter, type FileWriterSummary } from '../utils';
import { GENERATED_ROOT } from '../internal';
import type * as Prettier from 'prettier';

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
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.generate`,
			level: this.verbose ? 'debug' : 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		let loadedConfig: Awaited<ReturnType<typeof loadKernelConfig>>;
		try {
			loadedConfig = await loadKernelConfig();
		} catch (error) {
			return this.handleFailure(error, reporter, 1);
		}

		let ir: IRv1;
		try {
			ir = await buildIr({
				config: loadedConfig.config,
				sourcePath: loadedConfig.sourcePath,
				origin: loadedConfig.configOrigin,
				namespace: loadedConfig.namespace,
			});
		} catch (error) {
			return this.handleFailure(error, reporter, 1);
		}

		const outputDir = path.resolve(process.cwd(), GENERATED_ROOT);
		const configDirectory = path.dirname(loadedConfig.sourcePath);
		const writer = new FileWriter({ dryRun: this.dryRun });

		const adapterContext: AdapterContext = {
			config: loadedConfig.config,
			namespace: ir.meta.sanitizedNamespace,
			reporter: reporter.child('adapter'),
		};

		const phpAdapter = this.evaluatePhpAdapter(
			loadedConfig.config,
			adapterContext,
			reporter
		);
		if (phpAdapter instanceof Error) {
			return 3;
		}

		const printerContext: PrinterContext = {
			ir,
			outputDir,
			configDirectory,
			formatPhp: (filePath, contents) =>
				this.formatPhp(contents, filePath),
			formatTs: (filePath, contents) => this.formatTs(contents, filePath),
			writeFile: async (filePath, contents) => {
				await writer.write(filePath, contents);
			},
			ensureDirectory: async (directoryPath: string) => {
				if (!this.dryRun) {
					await fs.mkdir(directoryPath, { recursive: true });
				}
			},
			phpAdapter,
			adapterContext: { ...adapterContext, ir },
		};

		try {
			await emitGeneratedArtifacts(printerContext);
		} catch (error) {
			this.reportError(reporter, 'Printer failure.', error);
			return 2;
		}

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

		return 0;
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
