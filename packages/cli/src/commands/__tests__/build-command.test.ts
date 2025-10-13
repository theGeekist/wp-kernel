import { Writable } from 'node:stream';
import { BuildCommand } from '../build';
import { runGenerate } from '../run-generate';

const runGenerateMock = runGenerate as jest.MockedFunction<typeof runGenerate>;
const applyExecuteMock = jest.fn<Promise<number>, [unknown]>();
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

		async execute(): Promise<number> {
			return applyExecuteMock(this);
		}
	},
}));

describe('BuildCommand', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		runGenerateMock.mockResolvedValue({ exitCode: 0, output: '' });
		applyExecuteMock.mockResolvedValue(0);
		applyInstances.length = 0;
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it('runs generate, vite build, and apply', async () => {
		runGenerateMock.mockResolvedValue({
			exitCode: 0,
			output: '[summary]\n',
		});
		applyExecuteMock.mockImplementation(async (instance: any) => {
			instance.summary = { files: 1 };
			instance.phpSummary = { files: 1 };
			instance.blockSummary = { files: 0 };
			return 0;
		});

		const { command, runViteBuildMock } = createCommand();
		runViteBuildMock.mockResolvedValue(0);
		const executePromise = command.execute();

		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(0);
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

		expect(exitCode).toBe(0);
		expect(runViteBuildMock).toHaveBeenCalledTimes(1);
		expect(applyInstances).toHaveLength(0);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});

	it('returns generate exit code on failure', async () => {
		runGenerateMock.mockResolvedValue({ exitCode: 3, output: '' });

		const { command } = createCommand();
		const exitCode = await command.execute();

		expect(exitCode).toBe(3);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});

	it('returns vite exit code on failure', async () => {
		const { command, runViteBuildMock } = createCommand();
		runViteBuildMock.mockResolvedValue(2);
		const executePromise = command.execute();

		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(2);
		expect(runViteBuildMock).toHaveBeenCalledTimes(1);
		expect(applyExecuteMock).not.toHaveBeenCalled();
	});

	it('returns error when apply fails', async () => {
		applyExecuteMock.mockResolvedValue(5);

		const { command, runViteBuildMock } = createCommand();
		runViteBuildMock.mockResolvedValue(0);
		const executePromise = command.execute();

		await flushAsync();
		const exitCode = await executePromise;

		expect(exitCode).toBe(5);
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

		expect(exitCode).toBe(1);
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
