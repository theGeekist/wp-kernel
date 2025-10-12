import path from 'node:path';
import { renderPhpFile } from './render';
import type { PrinterContext } from '../types';
import type { PhpFileBuilder } from './builder';
import { ensureAdapterContext } from './context';

export async function writePhpArtifact(
	filePath: string,
	builder: PhpFileBuilder,
	context: PrinterContext
): Promise<void> {
	const adapterContext = ensureAdapterContext(context);

	if (context.phpAdapter?.customise) {
		context.phpAdapter.customise(builder, adapterContext);
	}

	const ast = builder.toAst();
	const rendered = renderPhpFile(ast);
	const formatted = await context.formatPhp(filePath, rendered);
	await context.ensureDirectory(path.dirname(filePath));
	await context.writeFile(filePath, formatted);
}
