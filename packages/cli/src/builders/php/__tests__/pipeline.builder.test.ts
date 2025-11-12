import { createPhpBuilder } from '../pipeline.builder';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../test-support/php-builder.test-support';

const codemodApplyMock = jest.fn(async (_options, next) => {
	await next?.();
});
const createCodemodHelperImpl = jest.fn(() => ({
	key: 'builder.generate.php.codemod-ingestion',
	kind: 'builder' as const,
	apply: codemodApplyMock,
}));

const writerApplyMock = jest.fn(async (_options, next) => {
	await next?.();
});
const createWriterHelperImpl = jest.fn(() => ({
	key: 'builder.generate.php.writer',
	kind: 'builder' as const,
	apply: writerApplyMock,
}));

jest.mock('../pipeline.codemods', () => ({
	createPhpCodemodIngestionHelper: jest.fn((options) =>
		createCodemodHelperImpl(options)
	),
}));

jest.mock('@wpkernel/php-json-ast', () => {
	const actual = jest.requireActual('@wpkernel/php-json-ast');
	return {
		...actual,
		createPhpProgramWriterHelper: jest.fn((options) =>
			createWriterHelperImpl(options)
		),
	};
});

const { createPhpCodemodIngestionHelper } = jest.requireMock(
	'../pipeline.codemods'
) as {
	createPhpCodemodIngestionHelper: jest.Mock;
};
const { createPhpProgramWriterHelper } = jest.requireMock(
	'@wpkernel/php-json-ast'
) as {
	createPhpProgramWriterHelper: jest.Mock;
};

describe('createPhpBuilder - adapter codemods', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		codemodApplyMock.mockImplementation(async (_options, next) => {
			await next?.();
		});
		writerApplyMock.mockImplementation(async (_options, next) => {
			await next?.();
		});
	});

	it('threads adapter codemods through the helper pipeline', async () => {
		const builder = createPhpBuilder({
			driver: {
				binary: '/base/php',
				scriptPath: '/base/program-writer.php',
				importMetaUrl: 'file:///base/dist/index.js',
			},
		});

		const ir = createMinimalIr({
			config: {
				adapters: {
					php() {
						return {
							driver: {
								scriptPath: '/adapter/program-writer.php',
							},
							codemods: {
								files: ['plugin.php', ''],
								configurationPath: 'codemods/baseline.json',
								diagnostics: { nodeDumps: true },
								driver: {
									binary: '/adapter/php',
									scriptPath: '/adapter/codemod.php',
									importMetaUrl:
										'file:///adapter/dist/index.js',
								},
							},
						};
					},
				},
			},
		});

		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createPhpCodemodIngestionHelper).toHaveBeenCalledTimes(1);
		expect(createCodemodHelperImpl).toHaveBeenCalledWith({
			files: ['plugin.php', ''],
			configurationPath: 'codemods/baseline.json',
			enableDiagnostics: true,
			phpBinary: '/adapter/php',
			scriptPath: '/adapter/codemod.php',
			importMetaUrl: 'file:///adapter/dist/index.js',
		});
		expect(createPhpProgramWriterHelper).toHaveBeenCalledTimes(1);
		expect(createWriterHelperImpl).toHaveBeenCalledWith({
			driver: {
				binary: '/base/php',
				scriptPath: '/adapter/program-writer.php',
				importMetaUrl: 'file:///base/dist/index.js',
			},
		});
		expect(codemodApplyMock).toHaveBeenCalled();
		expect(writerApplyMock).toHaveBeenCalled();
	});

	it('skips codemod helper when no valid target files are declared', async () => {
		const builder = createPhpBuilder();

		const ir = createMinimalIr({
			config: {
				adapters: {
					php() {
						return {
							codemods: {
								files: [123 as unknown as string],
							},
						};
					},
				},
			},
		});

		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createPhpCodemodIngestionHelper).not.toHaveBeenCalled();
		expect(createPhpProgramWriterHelper).toHaveBeenCalledTimes(1);
	});

	it('defaults codemod driver overrides to the merged PHP driver options', async () => {
		const builder = createPhpBuilder({
			driver: {
				binary: '/base/php',
				scriptPath: '/base/codemod.php',
				importMetaUrl: 'file:///base/dist/index.js',
			},
		});

		const ir = createMinimalIr({
			config: {
				adapters: {
					php() {
						return {
							codemods: {
								files: ['plugin.php'],
								driver: {
									// no overrides provided
								},
							},
						};
					},
				},
			},
		});

		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createPhpCodemodIngestionHelper).toHaveBeenCalledTimes(1);
		expect(createCodemodHelperImpl).toHaveBeenCalledWith(
			expect.objectContaining({
				phpBinary: '/base/php',
				scriptPath: '/base/codemod.php',
				importMetaUrl: 'file:///base/dist/index.js',
			})
		);
	});
});
