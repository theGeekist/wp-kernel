import { loadConfigAndIr, createDefaultReporter } from './load-config';
import {
	prepareGeneration,
	type PreparationSuccess,
	type PreparationFailure,
} from './prepare-generation';
import { runPrinters } from './printer-runner';
import { commitExtensions } from './extensions';
import { renderSummary } from './summary';
import type {
	RunGenerateOptions,
	RunGenerateResult,
	GenerationSummary,
} from './types';
import type { Reporter } from '@geekist/wp-kernel/reporter';

export async function runGenerate(
	options: RunGenerateOptions = {}
): Promise<RunGenerateResult> {
	const { dryRun = false, verbose = false } = options;
	const reporter: Reporter =
		options.reporter ?? createDefaultReporter(verbose);

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

	if (isPreparationFailure(preparation)) {
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

function isPreparationFailure(
	value: PreparationSuccess | PreparationFailure
): value is PreparationFailure {
	return 'exitCode' in value;
}
