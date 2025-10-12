import type { Reporter } from '@geekist/wp-kernel';
import { emitGeneratedArtifacts } from '../../printers';
import type { PrinterContext } from '../../printers';
import type { AdapterExtensionRunResult } from '../../adapters';
import { AdapterEvaluationError, rollbackExtensions } from './extensions';
import { reportError } from './reporting';
import type { RunGenerateResult } from './types';

export type PrinterRunResult = RunGenerateResult | null;

export async function runPrinters(
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
