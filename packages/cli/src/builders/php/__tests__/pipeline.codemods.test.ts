import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import {
	consumePhpProgramIngestion,
	runPhpCodemodIngestion,
} from '@wpkernel/php-json-ast';
import { type Workspace } from '../../../workspace';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { createPhpCodemodIngestionHelper } from '../pipeline.codemods';
import {
	createBuilderInput,
	createBuilderOutput,
	createPipelineContext,
} from '../test-support/php-builder.test-support';
import { resolveBundledPhpJsonAstIngestionPath } from '@wpkernel/cli/utils/phpAssets';
import { buildEmptyGenerationState } from '../../../apply/manifest';

jest.mock('@wpkernel/php-json-ast', () => ({
	...jest.requireActual('@wpkernel/php-json-ast'),
	runPhpCodemodIngestion: jest.fn(),
	consumePhpProgramIngestion: jest.fn(),
}));

const runCodemodMock = jest.mocked(runPhpCodemodIngestion);
const consumeMock = jest.mocked(consumePhpProgramIngestion);

describe('createPhpCodemodIngestionHelper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('skips ingestion when the phase is not generate', async () => {
		const helper = createPhpCodemodIngestionHelper({
			files: ['plugin.php'],
		});
		const context = createPipelineContext({
			phase: 'init',
			generationState: buildEmptyGenerationState(),
		});
		const input = createBuilderInput({ phase: 'init' });
		const output = createBuilderOutput();

		await helper.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(runCodemodMock).not.toHaveBeenCalled();
		expect(consumeMock).not.toHaveBeenCalled();
	});

	it('ignores missing codemod targets and logs a warning', async () => {
		const helper = createPhpCodemodIngestionHelper({
			files: ['missing.php'],
		});
		const workspace = makeWorkspaceMock({
			root: '/workspace/project',
			exists: jest.fn(async () => false),
		}) as unknown as Workspace;
		const context = createPipelineContext({
			workspace,
			generationState: buildEmptyGenerationState(),
		});
		const input = createBuilderInput();
		const output = createBuilderOutput();

		await helper.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(context.reporter.warn).toHaveBeenCalledWith(
			'createPhpCodemodIngestionHelper: codemod target missing, skipping.',
			{ file: 'missing.php' }
		);
		expect(runCodemodMock).not.toHaveBeenCalled();
	});

	it('runs ingestion for declared targets and forwards the payload', async () => {
		const helper = createPhpCodemodIngestionHelper({
			files: ['plugin.php'],
		});
		const workspace = makeWorkspaceMock({
			root: '/workspace/project',
			exists: jest.fn(async () => true),
			resolve: (...parts: string[]) =>
				path.join('/workspace/project', ...parts),
		}) as unknown as Workspace;
		const context = createPipelineContext({
			workspace,
			generationState: buildEmptyGenerationState(),
		});
		const input = createBuilderInput();
		const output = createBuilderOutput();

		runCodemodMock.mockResolvedValueOnce({
			lines: [
				JSON.stringify({
					file: '/workspace/project/plugin.php',
					program: [{ nodeType: 'Stmt_Nop' }],
				}),
			],
			exitCode: 0,
			stderr: '',
		});
		consumeMock.mockResolvedValueOnce(undefined);

		await helper.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(runCodemodMock).toHaveBeenCalledWith({
			workspaceRoot: '/workspace/project',
			files: ['/workspace/project/plugin.php'],
			phpBinary: undefined,
			scriptPath: BUNDLED_INGESTION_PATH,
			configurationPath: undefined,
			enableDiagnostics: undefined,
			importMetaUrl: undefined,
			autoloadPaths: undefined,
		});
		expect(consumeMock).toHaveBeenCalledTimes(1);
	});

	it('resolves configuration paths, diagnostics, and driver overrides', async () => {
		const helper = createPhpCodemodIngestionHelper({
			files: ['plugin.php', 'plugin.php'],
			configurationPath: 'codemods/baseline.json',
			enableDiagnostics: true,
			phpBinary: '/usr/bin/php',
			scriptPath: '/pkg/php/ingest-program.php',
			importMetaUrl: 'file:///pkg/dist/index.js',
		});

		const workspace = makeWorkspaceMock({
			root: '/workspace/project',
			exists: jest.fn(async () => true),
			resolve: (...parts: string[]) =>
				path.join('/workspace/project', ...parts),
		}) as unknown as Workspace;
		const context = createPipelineContext({ workspace });
		const input = createBuilderInput();
		const output = createBuilderOutput();

		runCodemodMock.mockResolvedValueOnce({
			lines: [],
			exitCode: 0,
			stderr: '',
		});
		consumeMock.mockResolvedValueOnce(undefined);

		await helper.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(runCodemodMock).toHaveBeenCalledWith({
			workspaceRoot: '/workspace/project',
			files: ['/workspace/project/plugin.php'],
			phpBinary: '/usr/bin/php',
			scriptPath: '/pkg/php/ingest-program.php',
			configurationPath: '/workspace/project/codemods/baseline.json',
			enableDiagnostics: true,
			importMetaUrl: 'file:///pkg/dist/index.js',
			autoloadPaths: undefined,
		});
		expect(consumeMock).toHaveBeenCalledTimes(1);
	});

	it('throws a WPKernelError when the ingestion process exits with a non-zero code', async () => {
		const helper = createPhpCodemodIngestionHelper({
			files: ['plugin.php'],
		});
		const workspace = makeWorkspaceMock({
			root: '/workspace/project',
			exists: jest.fn(async () => true),
			resolve: (...parts: string[]) =>
				path.join('/workspace/project', ...parts),
		}) as unknown as Workspace;
		const context = createPipelineContext({ workspace });
		const input = createBuilderInput();
		const output = createBuilderOutput();

		runCodemodMock.mockResolvedValueOnce({
			lines: [],
			exitCode: 2,
			stderr: 'fatal error',
		});

		await expect(
			helper.apply(
				{ context, input, output, reporter: context.reporter },
				undefined
			)
		).rejects.toThrow(WPKernelError);

		expect(runCodemodMock).toHaveBeenCalled();
		expect(consumeMock).not.toHaveBeenCalled();
	});
});
const BUNDLED_INGESTION_PATH = resolveBundledPhpJsonAstIngestionPath();
