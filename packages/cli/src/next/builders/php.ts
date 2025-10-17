import fs from 'node:fs/promises';
import path from 'node:path';
import { createHelper } from '../helper';
import { emitPhpArtifacts } from '../../printers/php/printer';
import type { PrinterContext } from '../../printers';
import type { BuilderHelper, BuilderOutput } from '../runtime/types';
import { createPhpPrettyPrinter } from './phpBridge';

interface BuildPhpArtifactsOptions {
	readonly context: Parameters<BuilderHelper['apply']>[0]['context'];
	readonly input: Parameters<BuilderHelper['apply']>[0]['input'];
	readonly output: BuilderOutput;
}

async function queueManifestWrites(
	options: BuildPhpArtifactsOptions,
	writes: readonly string[]
): Promise<void> {
	const { context, output } = options;

	for (const relative of writes) {
		const contents = await context.workspace.read(relative);
		if (!contents) {
			continue;
		}

		output.queueWrite({
			file: relative,
			contents,
		});
	}
}

async function buildPhpArtifacts(
	options: BuildPhpArtifactsOptions
): Promise<void> {
	const {
		context,
		input: { ir, options: buildOptions },
	} = options;

	const outputRoot = path.dirname(ir.php.outputDir);
	const prettyPrinter = createPhpPrettyPrinter({
		workspace: context.workspace,
	});

	const printerContext: PrinterContext = {
		ir,
		outputDir: context.workspace.resolve(outputRoot),
		configDirectory: path.dirname(buildOptions.sourcePath),
		formatPhp: async (filePath, contents) => {
			const result = await prettyPrinter.prettyPrint({
				filePath,
				code: contents,
			});
			return result.code;
		},
		// TS formatting is not required for the PHP builder bridge.
		formatTs: async (_filePath, contents) => contents,
		writeFile: async (filePath, contents) => {
			await context.workspace.write(filePath, contents, {
				ensureDir: true,
			});
		},
		ensureDirectory: async (directoryPath) => {
			await fs.mkdir(directoryPath, { recursive: true });
		},
		phpDriver: {
			prettyPrint: (payload) => prettyPrinter.prettyPrint(payload),
		},
	} satisfies PrinterContext;

	await emitPhpArtifacts(printerContext);
}

export function createPhpBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.core',
		kind: 'builder',
		dependsOn: ['builder.generate.php.driver'],
		async apply({ context, input, output, reporter }) {
			const label = 'builder.generate.php.core';
			context.workspace.begin(label);

			try {
				await buildPhpArtifacts({
					context,
					input,
					output,
				});
				const manifest = await context.workspace.commit(label);
				await queueManifestWrites(
					{
						context,
						input,
						output,
					},
					manifest.writes
				);
				reporter.debug('PHP artifacts generated.');
			} catch (error) {
				await context.workspace.rollback(label);
				throw error;
			}
		},
	});
}
