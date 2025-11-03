import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import { createPhpProgramWriterHelper } from '../writer';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { buildStmtNop } from '@wpkernel/php-json-ast';
import { resetPhpAstChannel } from '@wpkernel/wp-json-ast';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';

jest.mock('@wpkernel/php-driver', () => ({
	buildPhpPrettyPrinter: jest.fn(() => ({
		prettyPrint: jest.fn(async ({ program }) => ({
			code: '<?php\n// generated\n',
			ast: program,
		})),
	})),
}));

const buildPhpPrettyPrinterMock = jest.mocked(buildPhpPrettyPrinter);

function buildReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildPipelineContext(): PipelineContext {
	const workspace = makeWorkspaceMock({
		root: '/workspace',
		cwd: () => '/workspace',
		resolve: (...parts: string[]) => path.join('/workspace', ...parts),
		write: jest.fn(async () => undefined),
		writeJson: jest.fn(async () => undefined),
	});

	return {
		workspace,
		reporter: buildReporter(),
		phase: 'generate',
	};
}

function buildBuilderInput(): BuilderInput {
	return {
		phase: 'generate',
		options: {
			config: {} as never,
			namespace: 'demo-plugin',
			origin: 'wpk.config.ts',
			sourcePath: 'wpk.config.ts',
		},
		ir: null,
	};
}

describe('createPhpProgramWriterHelper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('writes queued programs using the pretty printer', async () => {
		const context = buildPipelineContext();
		const input = buildBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop(), buildStmtNop()];
		channel.queue({
			file: '/workspace/.generated/php/Writer.php',
			metadata: { kind: 'capability-helper' },
			docblock: ['Doc line'],
			uses: ['Demo\\Contracts'],
			statements: ['class Example {};'],
			program,
		});

		const helper = createPhpProgramWriterHelper();
		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const firstCall = buildPhpPrettyPrinterMock.mock.results[0];
		if (!firstCall || !firstCall.value) {
			throw new Error('Expected pretty printer to be constructed.');
		}
		const prettyPrinter = firstCall.value;
		expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
			filePath: '/workspace/.generated/php/Writer.php',
			program,
		});

		expect(context.workspace.write).toHaveBeenCalledWith(
			'/workspace/.generated/php/Writer.php',
			'<?php\n// generated\n',
			{ ensureDir: true }
		);
		expect(context.workspace.write).toHaveBeenCalledWith(
			'/workspace/.generated/php/Writer.php.ast.json',
			expect.stringContaining('Stmt_Nop'),
			{ ensureDir: true }
		);

		expect(output.queueWrite).toHaveBeenCalledWith({
			file: '/workspace/.generated/php/Writer.php',
			contents: '<?php\n// generated\n',
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: '/workspace/.generated/php/Writer.php.ast.json',
			contents: expect.stringContaining('Stmt_Nop'),
		});

		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: emitted PHP artifact.',
			{ file: '/workspace/.generated/php/Writer.php' }
		);
	});

	it('threads driver configuration overrides to the pretty printer', async () => {
		const context = buildPipelineContext();
		const input = buildBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop()];
		channel.queue({
			file: '/workspace/.generated/php/Override.php',
			metadata: { kind: 'capability-helper' },
			docblock: [],
			uses: [],
			statements: [],
			program,
		});

		const helper = (
			createPhpProgramWriterHelper as (
				options?: unknown
			) => ReturnType<typeof createPhpProgramWriterHelper>
		)({
			driver: {
				binary: '/usr/bin/php82',
				scriptPath: '/custom/pretty-print.php',
				importMetaUrl: 'file:///custom/pkg/dist/index.js',
			},
		});
		await helper.apply({
			context,
			input,
			output,
			reporter: context.reporter,
		});

		expect(buildPhpPrettyPrinterMock).toHaveBeenCalledWith({
			workspace: context.workspace,
			phpBinary: '/usr/bin/php82',
			scriptPath: '/custom/pretty-print.php',
			importMetaUrl: 'file:///custom/pkg/dist/index.js',
		});
	});

	it('serialises the queued program when the driver omits the AST payload', async () => {
		const context = buildPipelineContext();
		const input = buildBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop()];
		const expectedSerialisedAst = `${JSON.stringify(program, null, 2)}\n`;
		channel.queue({
			file: '/workspace/.generated/php/Fallback.php',
			metadata: { kind: 'capability-helper' },
			docblock: ['Doc line'],
			uses: ['Demo\\Contracts'],
			statements: ['class Example {};'],
			program,
		});

		const prettyPrint = jest.fn(async () => ({
			code: '<?php\n// generated fallback\n',
			ast: undefined,
		}));

		buildPhpPrettyPrinterMock.mockImplementationOnce(
			() =>
				({ prettyPrint }) as unknown as ReturnType<
					typeof buildPhpPrettyPrinter
				>
		);

		const helper = createPhpProgramWriterHelper();
		await helper.apply({
			context,
			input,
			output,
			reporter: context.reporter,
		});

		expect(prettyPrint).toHaveBeenCalledWith({
			filePath: '/workspace/.generated/php/Fallback.php',
			program,
		});

		expect(context.workspace.write).toHaveBeenCalledWith(
			'/workspace/.generated/php/Fallback.php.ast.json',
			expectedSerialisedAst,
			{ ensureDir: true }
		);
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: '/workspace/.generated/php/Fallback.php.ast.json',
			contents: expectedSerialisedAst,
		});

		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: emitted PHP artifact.',
			{ file: '/workspace/.generated/php/Fallback.php' }
		);
	});

	it('logs when no programs are queued and awaits the next helper', async () => {
		const context = buildPipelineContext();
		const input = buildBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpProgramWriterHelper();
		const next = jest.fn(async () => undefined);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			next
		);

		expect(buildPhpPrettyPrinterMock).not.toHaveBeenCalled();
		expect(output.queueWrite).not.toHaveBeenCalled();
		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: no programs queued.'
		);
		expect(next).toHaveBeenCalledTimes(1);
	});
});
