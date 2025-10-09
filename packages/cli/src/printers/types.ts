import type { AdapterContext, PhpAdapterConfig } from '../config/types';
import type { IRv1 } from '../ir';

export interface PrinterContext {
	ir: IRv1;
	outputDir: string;
	/**
	 * Absolute path to the directory containing the active kernel config.
	 * When omitted the printers fall back to the directory inferred from
	 * the IR metadata source path relative to the current working directory.
	 */
	configDirectory?: string;
	formatPhp: (filePath: string, contents: string) => Promise<string>;
	formatTs: (filePath: string, contents: string) => Promise<string>;
	phpAdapter?: PhpAdapterConfig;
	adapterContext?: AdapterContext & { ir: IRv1 };
}
