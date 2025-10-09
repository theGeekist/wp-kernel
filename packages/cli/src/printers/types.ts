import type { IRv1 } from '../ir';

export interface PrinterContext {
	ir: IRv1;
	outputDir: string;
	formatPhp: (filePath: string, contents: string) => Promise<string>;
	formatTs: (filePath: string, contents: string) => Promise<string>;
}
