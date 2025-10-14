import { Writable } from 'node:stream';
import { BuildCommand } from '../build';
import { runGenerate } from '../run-generate';
import { EXIT_CODES } from '../run-generate/types';
import type { WPKExitCode } from '@wpkernel/core/contracts';

const runGenerateMock = runGenerate as jest.MockedFunction<typeof runGenerate>;
const applyExecuteMock = jest.fn<Promise<WPKExitCode>, [unknown]>();
const applyInstances: unknown[] = [];

jest.mock('../run-generate', () => ({
	runGenerate: jest.fn(),
	serialiseError: (error: unknown) => ({
		message: error instanceof Error ? error.message : String(error),
	}),
}));

jest.mock('../apply', () => ({
	__esModule: true,
	ApplyCommand: class {
		yes = false;
		backup = false;
		force = false;
		summary: unknown = null;
		phpSummary: unknown = null;
		blockSummary: unknown = null;
		context: unknown;

		constructor() {
			applyInstances.push(this);
		}

		async execute(): Promise<WPKExitCode> {
			return applyExecuteMock(this);
		}
	},
}));

describe('BuildCommand', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		runGenerateMock.mockResolvedValue({
			exitCode: EXIT_CODES.SUCCESS,
			output: '',
		});
		applyExecuteMock.mockResolvedValue(EXIT_CODES.SUCCESS);
		applyInstances.length = 0;
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it('runs generate, vite build, and apply', async () => {
		runGenerateMock.mockResolvedValue({
			exitCode: EXIT_CODES.SUCCESS,
			output: '[summary]\n',
		});
		applyExecuteMock.mockImplementation(async (instance: any) => {
			instance.summary = { files: 1 };
			instance.phpSummary = { files: 1 };
			instance.blockSummary = { files: 0 };
			return EXIT_CODES.SUCCESS;
		});

		const { command, runViteBuildMock } = createCommand();
		runViteBuildMock.mockResolvedValue(EXIT_CODES.SUCCESS);
		const executePromise = command.execute();

		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(EXIT_CODES.SUCCESS);
		expect(runGenerateMock).toHaveBeenCalledTimes(1);
		expect(runViteBuildMock).toHaveBeenCalledTimes(1);
		expect(applyInstances).toHaveLength(1);
		expect(applyExecuteMock).toHaveBeenCalledTimes(1);

		const applyInstance = applyInstances[0] as any;
		expect(applyInstance.yes).toBe(true);
		expect(applyInstance.backup).toBe(false);
		expect(applyInstance.force).toBe(false);

		const stdout = (command.context.stdout as MemoryStream).toString();
		expect(stdout).toContain('[summary]');
	});

	it('skips apply when --no-apply is provided', async () => {
		const { command, runViteBuildMock } = createCommand();
		command.noApply = true;

		const executePromise = command.execute();
		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(EXIT_CODES.SUCCESS);
		expect(runViteBuildMock).toHaveBeenCalledTimes(1);
		expect(applyInstances).toHaveLength(0);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});

	it('returns generate exit code on failure', async () => {
		runGenerateMock.mockResolvedValue({
			exitCode: EXIT_CODES.ADAPTER_ERROR,
			output: '',
		});

		const { command } = createCommand();
		const exitCode = await command.execute();

		expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});

	it('returns vite exit code on failure', async () => {
		const { command, runViteBuildMock } = createCommand();
		runViteBuildMock.mockResolvedValue(EXIT_CODES.UNEXPECTED_ERROR);
		const executePromise = command.execute();

		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(EXIT_CODES.UNEXPECTED_ERROR);
		expect(runViteBuildMock).toHaveBeenCalledTimes(1);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});

	it('returns error when apply fails', async () => {
		applyExecuteMock.mockResolvedValue(EXIT_CODES.ADAPTER_ERROR);

		const { command, runViteBuildMock } = createCommand();
		runViteBuildMock.mockResolvedValue(EXIT_CODES.SUCCESS);
		const executePromise = command.execute();

		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
	});

	it('handles Vite spawn failures', async () => {
		const command = new BuildCommand();
		const stdout = new MemoryStream();
		const stderr = new MemoryStream();

		command.context = {
			stdout,
			stderr,
			stdin: process.stdin,
			env: process.env,
			cwd: () => process.cwd(),
			colorDepth: 1,
		} as BuildCommand['context'];

		jest.spyOn(
			command as unknown as BuildCommand,
			'createViteBuildProcess'
		).mockImplementation(() => {
			throw new Error('spawn failure');
		});

		const exitCode = await command.execute();

		expect(exitCode).toBe(EXIT_CODES.UNEXPECTED_ERROR);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});
});

function createCommand(): {
	command: BuildCommand;
	runViteBuildMock: jest.SpyInstance<Promise<number>, [unknown]>;
} {
	const command = new BuildCommand();
	const stdout = new MemoryStream();
	const stderr = new MemoryStream();

	command.context = {
		stdout,
		stderr,
		stdin: process.stdin,
		env: process.env,
		cwd: () => process.cwd(),
		colorDepth: 1,
	} as BuildCommand['context'];
	command.noApply = false;

	const runViteBuildMock = jest
		.spyOn(command as unknown as BuildCommand, 'runViteBuild')
		.mockResolvedValue(0);

	return { command, runViteBuildMock };
}

class MemoryStream extends Writable {
	private readonly chunks: string[] = [];

	override _write(
		chunk: string | Buffer,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void
	): void {
		this.chunks.push(chunk.toString());
		callback();
	}

	override toString(): string {
		return this.chunks.join('');
	}
}

async function flushAsync(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}
