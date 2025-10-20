import path from 'node:path';
import type { PhpAstBuilderAdapter } from '@wpkernel/cli/next/builders/php/ast/programBuilder';
import type { PrinterContext } from '../../../../printers/types';
import { ensureAdapterContext } from '../../../../printers/php/context';
import { KernelError } from '@wpkernel/core/error';

export async function writePhpArtifact(
	filePath: string,
	builder: PhpAstBuilderAdapter,
	context: PrinterContext
): Promise<void> {
	const adapterContext = ensureAdapterContext(context);

	if (context.phpAdapter?.customise) {
		context.phpAdapter.customise(builder, adapterContext);
	}

	const program = builder.getProgramAst();
	const driver = context.phpDriver;
	const targetDirectory = path.dirname(filePath);
	const astOutputPath = `${filePath}.ast.json`;

	if (!driver?.prettyPrint) {
		throw new KernelError('DeveloperError', {
			message:
				'PHP pretty printer bridge requires an active driver during AST emission.',
			data: {
				filePath,
			},
		});
	}

	const { code, ast } = await driver.prettyPrint({
		filePath,
		ast: program,
	});

	await context.ensureDirectory(targetDirectory);
	await context.writeFile(filePath, code);
	await context.writeFile(astOutputPath, serialiseAst(ast ?? program));
}

function serialiseAst(ast: unknown): string {
	return `${JSON.stringify(ast, null, 2)}\n`;
}
