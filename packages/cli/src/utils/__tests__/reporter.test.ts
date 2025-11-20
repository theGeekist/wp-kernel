import type { Reporter } from '@wpkernel/core/reporter';
import {
	logLayerInstances,
	mockedLogLayer,
	mockedSimplePrettyTerminalTransport,
	mockedWPKernelHooksTransport,
	resetLogLayerMocks,
} from '@cli-tests/mocks';
import { createReporterCLI } from '../reporter';

describe('createReporterCLI', () => {
	beforeEach(() => {
		resetLogLayerMocks();
		delete process.env.NODE_ENV;
	});

	it('creates a console reporter with pretty terminal transport', () => {
		const reporter: Reporter = createReporterCLI();

		reporter.info('hello');
		reporter.warn('warn', { foo: 'bar' });

		expect(mockedSimplePrettyTerminalTransport).toHaveBeenCalledWith({
			runtime: 'node',
			level: 'info',
			enabled: true,
		});
		expect(mockedLogLayer).toHaveBeenCalledTimes(1);
		expect(logLayerInstances[0]?.withContext).toHaveBeenCalledWith({
			namespace: expect.any(String),
		});
		expect(logLayerInstances[0]?.info).toHaveBeenCalledWith('hello');
		expect(logLayerInstances[0]?.withMetadata).toHaveBeenCalledWith({
			context: { foo: 'bar' },
		});
		expect(logLayerInstances[0]?.metadataTarget.warn).toHaveBeenCalledWith(
			'warn'
		);
	});

	it('disables logging when enabled is false', () => {
		const reporter: Reporter = createReporterCLI({ enabled: false });

		reporter.error('boom');

		expect(logLayerInstances[0]?.disableLogging).toHaveBeenCalled();
		expect(logLayerInstances[0]?.error).not.toHaveBeenCalled();
	});

	it('combines transports when channel is set to all', () => {
		const reporter: Reporter = createReporterCLI({
			channel: 'all',
			level: 'debug',
		});

		reporter.debug('combined');

		expect(mockedSimplePrettyTerminalTransport).toHaveBeenCalledWith({
			runtime: 'node',
			level: 'debug',
			enabled: true,
		});
		expect(mockedWPKernelHooksTransport).toHaveBeenCalledWith('debug');
		expect(logLayerInstances[0]?.debug).toHaveBeenCalledWith('combined');
	});

	it('creates hook-only transports when channel is hooks', () => {
		createReporterCLI({ channel: 'hooks' });

		expect(mockedSimplePrettyTerminalTransport).not.toHaveBeenCalled();
		expect(mockedWPKernelHooksTransport).toHaveBeenCalledWith('info');
	});

	it('respects production NODE_ENV when enabling transports', () => {
		process.env.NODE_ENV = 'production';

		createReporterCLI();

		expect(mockedSimplePrettyTerminalTransport).toHaveBeenCalledWith({
			runtime: 'node',
			level: 'info',
			enabled: false,
		});
	});

	it('throws when the bridge channel is requested', () => {
		expect(() => createReporterCLI({ channel: 'bridge' })).toThrow(
			'Bridge transport'
		);
	});

	it('creates child reporters with derived namespaces', () => {
		const reporter: Reporter = createReporterCLI({ namespace: 'cli' });

		reporter.child('dx').info('child');

		expect(logLayerInstances).toHaveLength(2);
		expect(logLayerInstances[1]?.withContext).toHaveBeenCalledWith({
			namespace: 'cli.dx',
		});
	});
});
