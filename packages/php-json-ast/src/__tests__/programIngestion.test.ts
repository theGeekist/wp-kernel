import path from 'node:path';
import { consumePhpProgramIngestion } from '../driver/programIngestion';
import {
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '../builderChannel';
import { WPKernelError } from '@wpkernel/core/contracts';
import type { PipelineContext, Workspace } from '../programBuilder';
import type { Reporter } from '@wpkernel/core/reporter';
import type { PhpFileMetadata } from '../types';

function createReporterMock(): Reporter {
	const reporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => reporter),
	};

	return reporter;
}

function createWorkspaceRoot(): string {
	return path.join(process.cwd(), 'packages', 'php-json-ast');
}

function createWorkspace(): Workspace {
	const root = createWorkspaceRoot();
	return {
		root,
		cwd: () => root,
		resolve: (...parts: string[]) => path.resolve(root, ...parts),
		write: jest.fn().mockResolvedValue(undefined),
		exists: jest.fn().mockResolvedValue(false),
	};
}

function createContext(reporter: Reporter): PipelineContext {
	return {
		workspace: createWorkspace(),
		phase: 'init',
		reporter,
	};
}

describe('consumePhpProgramIngestion', () => {
	it('queues chunked ingestion payloads from async iterable sources', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);
		resetPhpBuilderChannel(context);

		async function* createSource(): AsyncGenerator<string> {
			yield JSON.stringify({
				file: 'first.php',
				program: [],
				docblock: ['summary', 42, 'details'],
				uses: ['App\\Foo', null],
				statements: ['<?php echo 1;', false],
			});
			yield '\n\n';
			yield JSON.stringify({
				file: 'second.php',
				program: [],
				metadata: {
					kind: 'policy-helper',
				} satisfies PhpFileMetadata,
				docblock: ['explicit'],
			}).slice(0, -1);
			yield '}\n';
			yield JSON.stringify({
				file: 'third.php',
				program: [],
				uses: ['FinalUse'],
			});
		}

		const defaultMetadata: PhpFileMetadata = { kind: 'index-file' };

		await consumePhpProgramIngestion({
			context,
			source: createSource(),
			defaultMetadata,
			resolveFilePath: (message) => `prefixed/${message.file}`,
		});

		const actions = getPhpBuilderChannel(context).drain();
		expect(actions).toHaveLength(3);

		expect(actions[0]).toEqual({
			file: 'prefixed/first.php',
			program: [],
			metadata: defaultMetadata,
			docblock: ['summary', 'details'],
			uses: ['App\\Foo'],
			statements: ['<?php echo 1;'],
		});

		expect(actions[1]).toEqual({
			file: 'prefixed/second.php',
			program: [],
			metadata: { kind: 'policy-helper' },
			docblock: ['explicit'],
			uses: [],
			statements: [],
		});

		expect(actions[2]).toEqual({
			file: 'prefixed/third.php',
			program: [],
			metadata: defaultMetadata,
			docblock: [],
			uses: ['FinalUse'],
			statements: [],
		});

		expect(reporter.debug).toHaveBeenNthCalledWith(
			1,
			'consumePhpProgramIngestion: queued program from PHP stream.',
			{ file: 'prefixed/first.php' }
		);
		expect(reporter.debug).toHaveBeenNthCalledWith(
			2,
			'consumePhpProgramIngestion: queued program from PHP stream.',
			{ file: 'prefixed/second.php' }
		);
		expect(reporter.debug).toHaveBeenNthCalledWith(
			3,
			'consumePhpProgramIngestion: queued program from PHP stream.',
			{ file: 'prefixed/third.php' }
		);
	});

	it('logs when the ingestion source emits no payloads', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);
		resetPhpBuilderChannel(context);

		await consumePhpProgramIngestion({
			context,
			source: [],
		});

		expect(getPhpBuilderChannel(context).drain()).toHaveLength(0);
		expect(reporter.debug).toHaveBeenCalledTimes(1);
		expect(reporter.debug).toHaveBeenCalledWith(
			'consumePhpProgramIngestion: source completed without emitting payloads.'
		);
	});

	it('throws when the resolved file path is empty', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);

		await expect(
			consumePhpProgramIngestion({
				context,
				source: [
					JSON.stringify({
						file: 'invalid.php',
						program: [],
					}),
				],
				resolveFilePath: () => '',
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			message: 'Resolved ingestion file path was empty.',
		});
	});

	it('throws when the ingestion payload is structurally invalid', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);

		await expect(
			consumePhpProgramIngestion({
				context,
				source: [JSON.stringify({ file: 'broken.php' })],
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			message: 'Invalid PHP ingestion payload received.',
		});
	});

	it('throws when the ingestion payload is not an object', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);

		await expect(
			consumePhpProgramIngestion({
				context,
				source: ['null'],
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			message: 'Invalid PHP ingestion payload received.',
		});
	});

	it('throws when the ingestion payload file field is not a string', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);

		await expect(
			consumePhpProgramIngestion({
				context,
				source: [
					JSON.stringify({
						file: 123,
						program: [],
					}),
				],
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			message: 'Invalid PHP ingestion payload received.',
		});
	});

	it('throws when the ingestion payload cannot be parsed as JSON', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);

		await expect(
			consumePhpProgramIngestion({
				context,
				source: ['{"file": "unterminated"'],
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('throws when the source cannot be iterated', async () => {
		const reporter = createReporterMock();
		const context = createContext(reporter);

		await expect(
			consumePhpProgramIngestion({
				context,
				// @ts-expect-error - deliberately passing unsupported source
				source: { notIterable: true },
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			message: 'Unsupported ingestion source provided.',
		});
	});
});
