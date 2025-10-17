import type { AdapterContext, PhpAdapterConfig } from '../config/types';
import type { PhpJsonAst } from './php/types';
import type { IRv1 } from '../ir';

export interface PhpPrettyPrintOptions {
	filePath: string;
	code?: string;
	/**
	 * Reserved for future use when next-gen generators emit PhpParser-compatible
	 * JSON payloads directly from the TypeScript printers.
	 */
	ast?: PhpJsonAst;
}

export interface PhpPrettyPrintResult {
	code: string;
	ast?: PhpJsonAst;
}

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
	writeFile: (filePath: string, contents: string) => Promise<void>;
	ensureDirectory: (directoryPath: string) => Promise<void>;
	phpAdapter?: PhpAdapterConfig;
	phpDriver?: {
		prettyPrint: (
			options: PhpPrettyPrintOptions
		) => Promise<PhpPrettyPrintResult>;
	};
	adapterContext?: AdapterContext & { ir: IRv1 };
}
