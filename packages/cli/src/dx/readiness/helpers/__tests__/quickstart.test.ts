import { EnvironmentalError } from '@wpkernel/core/error';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { DxContext } from '../../../context';
import { createQuickstartReadinessHelper } from '../quickstart';

describe('quickstart readiness helper', () => {
	const baseContext: DxContext = {
		reporter: createNoopReporter(),
		workspace: null,
		environment: {
			cwd: process.cwd(),
			projectRoot: process.cwd(),
			workspaceRoot: null,
		},
	};

	function createError(
		code: string,
		stdout = '',
		stderr = ''
	): NodeJS.ErrnoException & { stdout?: string; stderr?: string } {
		const error = new Error(code) as NodeJS.ErrnoException & {
			stdout?: string;
			stderr?: string;
		};
		error.code = code;
		if (stdout) {
			error.stdout = stdout;
		}
		if (stderr) {
			error.stderr = stderr;
		}
		return error;
	}

	it('throws EnvironmentalError when wpk binary is missing', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-123');
		const rm = jest.fn(async () => undefined);
		const exec = jest.fn(async () => ({ stdout: '', stderr: '' }));
		const access = jest.fn().mockRejectedValue(createError('ENOENT'));
		const resolve = jest.fn();

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await helper.detect(baseContext).catch((error) => {
			expect(error).toBeInstanceOf(EnvironmentalError);
			expect((error as EnvironmentalError).reason).toBe(
				'cli.binary.missing'
			);
		});

		expect(exec).toHaveBeenCalledTimes(1);
		expect(rm).toHaveBeenCalledWith('/tmp/wpk-quickstart-123', {
			recursive: true,
			force: true,
		});
	});

	it('throws EnvironmentalError when tsx runtime is missing', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-456');
		const rm = jest.fn(async () => undefined);
		const exec = jest.fn(async () => ({ stdout: '', stderr: '' }));
		const access = jest.fn(async () => undefined);
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error("Cannot find module 'tsx'");
		});

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe('tsx.missing');
		});

		expect(exec).toHaveBeenCalledTimes(1);
		expect(rm).toHaveBeenCalledWith('/tmp/wpk-quickstart-456', {
			recursive: true,
			force: true,
		});
	});

	it('reports ready when create and generate succeed', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-789');
		const rm = jest.fn(async () => undefined);
		const exec = jest
			.fn()
			.mockResolvedValueOnce({ stdout: 'scaffold', stderr: '' })
			.mockResolvedValueOnce({ stdout: 'generate', stderr: '' });
		const access = jest.fn(async () => undefined);
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/wpk-quickstart-789/quickstart/node_modules/tsx'
			);

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		const detection = await helper.detect(baseContext);

		expect(detection.status).toBe('ready');
		expect(detection.message).toContain('Quickstart scaffolding verified');
		expect(exec).toHaveBeenCalledTimes(2);
		expect(exec.mock.calls[0][0]).toBe('npm');
		expect(exec.mock.calls[0][1]).toEqual([
			'create',
			'@wpkernel/wpk',
			'quickstart',
		]);
		expect(resolve).toHaveBeenCalled();

		const confirmation = await helper.confirm(baseContext, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(rm).toHaveBeenCalledWith('/tmp/wpk-quickstart-789', {
			recursive: true,
			force: true,
		});
	});

	it('rethrows unexpected access errors when resolving binary candidates', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-999');
		const rm = jest.fn(async () => undefined);
		const exec = jest.fn(async () => ({ stdout: '', stderr: '' }));
		const accessError = createError('EACCES');
		const access = jest.fn().mockRejectedValue(accessError);
		const resolve = jest.fn();

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await expect(helper.detect(baseContext)).rejects.toBe(accessError);
	});

	it('throws cli.binary.missing when the generate invocation cannot resolve the binary', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-111');
		const rm = jest.fn(async () => undefined);
		const exec = jest
			.fn()
			.mockResolvedValueOnce({ stdout: '', stderr: '' })
			.mockRejectedValueOnce(createError('ENOENT'));
		const access = jest.fn(async () => undefined);
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/wpk-quickstart-111/quickstart/node_modules/tsx'
			);

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe(
				'cli.binary.missing'
			);
		});
	});

	it('surfaces tsx missing errors when generate stdout reports module absence', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-222');
		const rm = jest.fn(async () => undefined);
		const exec = jest
			.fn()
			.mockResolvedValueOnce({ stdout: '', stderr: '' })
			.mockRejectedValueOnce(
				createError('EFAIL', "Cannot find module 'tsx'", '')
			);
		const access = jest.fn(async () => undefined);
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/wpk-quickstart-222/quickstart/node_modules/tsx'
			);

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe('tsx.missing');
		});
	});

	it('wraps unexpected generate failures in cli.quickstart.failed errors', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-333');
		const rm = jest.fn(async () => undefined);
		const exec = jest
			.fn()
			.mockResolvedValueOnce({ stdout: '', stderr: '' })
			.mockRejectedValueOnce(
				createError('EFAIL', 'unexpected', 'generate failed')
			);
		const access = jest.fn(async () => undefined);
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/wpk-quickstart-333/quickstart/node_modules/tsx'
			);

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe(
				'cli.quickstart.failed'
			);
		});
	});

	it('checks Windows binary candidates when resolving the CLI entrypoint', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-444');
		const rm = jest.fn(async () => undefined);
		const exec = jest
			.fn()
			.mockResolvedValueOnce({ stdout: '', stderr: '' })
			.mockResolvedValueOnce({ stdout: 'generate', stderr: '' });
		const access = jest
			.fn()
			.mockRejectedValueOnce(createError('ENOENT'))
			.mockRejectedValueOnce(createError('ENOENT'))
			.mockResolvedValueOnce(undefined);
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/wpk-quickstart-444/quickstart/node_modules/tsx'
			);
		const originalDescriptor = Object.getOwnPropertyDescriptor(
			process,
			'platform'
		);
		Object.defineProperty(process, 'platform', {
			value: 'win32',
		});

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		try {
			const detection = await helper.detect(baseContext);
			expect(detection.status).toBe('ready');
		} finally {
			if (originalDescriptor) {
				Object.defineProperty(process, 'platform', originalDescriptor);
			}
		}
	});

	it('propagates unexpected tsx resolution failures', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-555');
		const rm = jest.fn(async () => undefined);
		const exec = jest.fn(async () => ({ stdout: '', stderr: '' }));
		const access = jest.fn(async () => undefined);
		const unexpected = new Error('resolution boom');
		const resolve = jest.fn(() => {
			throw unexpected;
		});

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		await expect(helper.detect(baseContext)).rejects.toBe(unexpected);
	});

	it('suppresses cleanup failures when removing the temp workspace', async () => {
		const mkdtemp = jest.fn(async () => '/tmp/wpk-quickstart-666');
		const rm = jest.fn(async () => {
			throw new Error('cleanup failed');
		});
		const exec = jest
			.fn()
			.mockResolvedValueOnce({ stdout: '', stderr: '' })
			.mockResolvedValueOnce({ stdout: 'generate', stderr: '' });
		const access = jest.fn(async () => undefined);
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/wpk-quickstart-666/quickstart/node_modules/tsx'
			);

		const helper = createQuickstartReadinessHelper({
			dependencies: { mkdtemp, rm, exec, access, resolve },
		});

		const detection = await helper.detect(baseContext);
		expect(detection.status).toBe('ready');
	});

	it('reports pending confirmation when the run has not completed', async () => {
		const helper = createQuickstartReadinessHelper();

		const confirmation = await helper.confirm(baseContext, {
			run: null,
		} as unknown as Parameters<
			ReturnType<typeof createQuickstartReadinessHelper>['confirm']
		>[1]);

		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe(
			'Quickstart execution has not completed yet.'
		);
	});
});
