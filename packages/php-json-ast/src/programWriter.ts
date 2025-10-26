import { createHelper } from '@wpkernel/core/pipeline';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import type {
	BuilderHelper,
	PipelineContext,
	BuilderInput,
	BuilderOutput,
} from './programBuilder';
import { getPhpBuilderChannel } from './builderChannel';

export interface PhpDriverConfigurationOptions {
	readonly binary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
}

export interface CreatePhpProgramWriterHelperOptions {
	readonly driver?: PhpDriverConfigurationOptions;
	readonly key?: string;
}

type BuilderApplyOptions<
	TContext extends PipelineContext,
	TInput extends BuilderInput,
	TOutput extends BuilderOutput,
> = Parameters<BuilderHelper<TContext, TInput, TOutput>['apply']>[0];
type BuilderNext = Parameters<BuilderHelper['apply']>[1];

export function createPhpProgramWriterHelper<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper<TContext, TInput, TOutput> {
	return createHelper<
		TContext,
		TInput,
		TOutput,
		PipelineContext['reporter'],
		'builder'
	>({
		key: options.key ?? 'builder.generate.php.writer',
		kind: 'builder',
		async apply(
			helperOptions: BuilderApplyOptions<TContext, TInput, TOutput>,
			next?: BuilderNext
		) {
			const { context, reporter, output } = helperOptions;
			const channel = getPhpBuilderChannel(context);
			const pending = channel.drain();

			if (pending.length === 0) {
				reporter.debug(
					'createPhpProgramWriterHelper: no programs queued.'
				);
				await next?.();
				return;
			}

			const prettyPrinterOptions: Parameters<
				typeof buildPhpPrettyPrinter
			>[0] = {
				workspace: context.workspace,
				phpBinary: options.driver?.binary,
				scriptPath: options.driver?.scriptPath,
			};

			if (options.driver?.importMetaUrl) {
				(
					prettyPrinterOptions as { importMetaUrl?: string }
				).importMetaUrl = options.driver.importMetaUrl;
			}

			const prettyPrinter = buildPhpPrettyPrinter(prettyPrinterOptions);

			for (const action of pending) {
				const { code, ast } = await prettyPrinter.prettyPrint({
					filePath: action.file,
					program: action.program,
				});

				const finalAst = ast ?? action.program;
				const astPath = `${action.file}.ast.json`;

				await context.workspace.write(action.file, code, {
					ensureDir: true,
				});

				const serialisedAst = serialiseAst(finalAst);

				await context.workspace.write(astPath, serialisedAst, {
					ensureDir: true,
				});

				output.queueWrite({
					file: action.file,
					contents: code,
				});

				output.queueWrite({
					file: astPath,
					contents: serialisedAst,
				});

				reporter.debug(
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
