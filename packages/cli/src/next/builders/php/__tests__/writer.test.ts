import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import { createPhpProgramWriterHelper } from '../writer';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { resetPhpAstChannel, buildStmtNop } from '@wpkernel/php-json-ast';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import { createWorkspaceMock } from '../../../../../tests/workspace.test-support';

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
	const workspace = createWorkspaceMock({
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
			origin: 'kernel.config.ts',
			sourcePath: 'kernel.config.ts',
		},
		ir: null,
	};
}

describe('createPhpProgramWriterHelper', () => {
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
			metadata: { kind: 'policy-helper' },
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
	});
});
