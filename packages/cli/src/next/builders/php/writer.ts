import { createHelper } from '@wpkernel/core/pipeline';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import { getPhpBuilderChannel } from './channel';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';

export function createPhpProgramWriterHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.writer',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const channel = getPhpBuilderChannel(options.context);
			const pending = channel.drain();

			if (pending.length === 0) {
				options.reporter.debug(
					'createPhpProgramWriterHelper: no programs queued.'
				);
				await next?.();
				return;
			}

			const prettyPrinter = buildPhpPrettyPrinter({
				workspace: options.context.workspace,
			});

			for (const action of pending) {
				const { code, ast } = await prettyPrinter.prettyPrint({
					filePath: action.file,
					program: action.program,
				});

				const finalAst = ast ?? action.program;
				const astPath = `${action.file}.ast.json`;

				await options.context.workspace.write(action.file, code, {
					ensureDir: true,
				});
				const serialisedAst = serialiseAst(finalAst);

				await options.context.workspace.write(astPath, serialisedAst, {
					ensureDir: true,
				});

				options.output.queueWrite({
					file: action.file,
					contents: code,
				});
				options.output.queueWrite({
					file: astPath,
					contents: serialisedAst,
				});
				options.reporter.debug(
					'createPhpProgramWriterHelper: emitted PHP artifact.',
					{ file: action.file }
				);
			}

			await next?.();
		},
	});
}

function serialiseAst(ast: unknown): string {
	return `${JSON.stringify(ast, null, 2)}\n`;
}
