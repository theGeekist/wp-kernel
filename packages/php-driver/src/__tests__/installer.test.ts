import { KernelError } from '@wpkernel/core/error';
import { createPhpDriverInstaller } from '../installer';

type Reporter = ReturnType<typeof createReporter>;

type Workspace = ReturnType<typeof baseWorkspace>;

const execFileMock = jest.fn();

jest.mock('node:util', () => ({
	promisify: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

jest.mock('node:child_process', () => ({
	execFile: (...args: unknown[]) => execFileMock(...args),
}));

function createReporter() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function baseWorkspace() {
	return {
		root: '/workspace',
		resolve: jest.fn((target: string) => `/workspace/${target}`),
		exists: jest.fn(async (target: string) => {
			return !target.endsWith('missing');
		}),
	};
}

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return { ...baseWorkspace(), ...overrides };
}

describe('createPhpDriverInstaller', () => {
	let reporter: Reporter;

	beforeEach(() => {
		execFileMock.mockReset();
		reporter = createReporter();
	});

	it('skips installation when vendor autoload exists', async () => {
		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace();

		await helper.apply(
			{
				context: { workspace },
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(workspace.resolve).toHaveBeenCalledWith('vendor/autoload.php');
		expect(workspace.exists).toHaveBeenNthCalledWith(
			1,
			'/workspace/composer.json'
		);
		expect(workspace.exists).toHaveBeenNthCalledWith(
			2,
			'/workspace/vendor/autoload.php'
		);
		expect(execFileMock).not.toHaveBeenCalled();
		expect(reporter.debug).toHaveBeenCalledWith(
			'PHP parser dependency detected via composer.'
		);
	});

	it('installs dependencies via composer when vendor autoload is missing', async () => {
		execFileMock.mockResolvedValue({ stdout: '', stderr: '' });

		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json') ? true : false
			),
		});

		await helper.apply(
			{
				context: { workspace },
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(execFileMock).toHaveBeenCalledWith('composer', ['install'], {
			cwd: workspace.root,
		});
		expect(reporter.info).toHaveBeenNthCalledWith(
			1,
			'Installing nikic/php-parser via composer (composer install).'
		);
		expect(reporter.info).toHaveBeenNthCalledWith(
			2,
			'nikic/php-parser installed successfully.'
		);
	});

	it('wraps composer failures in a KernelError', async () => {
		execFileMock.mockRejectedValue(new Error('composer failed'));

		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json') ? true : false
			),
		});

		await expect(
			helper.apply(
				{
					context: { workspace },
					input: undefined as never,
					output: undefined as never,
					reporter,
				},
				undefined
			)
		).rejects.toBeInstanceOf(KernelError);

		expect(reporter.error).toHaveBeenCalledWith(
			'Composer install failed while fetching nikic/php-parser.',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});

	it('skips installation when composer manifest is missing', async () => {
		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json') ? false : false
			),
		});

		await helper.apply(
			{
				context: { workspace },
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpDriverInstaller: composer.json missing, skipping installer.'
		);
		expect(execFileMock).not.toHaveBeenCalled();
	});
});
