import { LogLayer } from 'loglayer';
import { SimplePrettyTerminalTransport } from '@loglayer/transport-simple-pretty-terminal';
import { type Reporter, WPKernelHooksTransport } from '@wpkernel/core/reporter';

import { createReporterCLI } from '../reporter';

const logLayerInstances: Array<{
	withContext: jest.Mock;
	disableLogging: jest.Mock;
	withMetadata: jest.Mock<
		[metadata: { context: unknown }],
		{ debug: jest.Mock; warn: jest.Mock; error: jest.Mock; info: jest.Mock }
	>;
	debug: jest.Mock;
	warn: jest.Mock;
	error: jest.Mock;
	info: jest.Mock;
	metadataTarget: {
		debug: jest.Mock;
		warn: jest.Mock;
		error: jest.Mock;
		info: jest.Mock;
	};
}> = [];

jest.mock('loglayer', () => ({
	LogLayer: jest.fn().mockImplementation(() => {
		const metadataTarget = {
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		};

		const instance = {
			withContext: jest.fn(),
			disableLogging: jest.fn(),
			withMetadata: jest.fn().mockReturnValue(metadataTarget),
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			metadataTarget,
		};

		logLayerInstances.push(instance);
		return instance;
	}),
}));

jest.mock('@loglayer/transport-simple-pretty-terminal', () => ({
	SimplePrettyTerminalTransport: jest
		.fn()
		.mockImplementation(
			(options: {
				runtime: string;
				level: string;
				enabled: boolean;
			}) => ({
				kind: 'terminal',
				options,
			})
		),
}));

jest.mock('@wpkernel/core/reporter', () => ({
	...jest.requireActual('@wpkernel/core/reporter'),
	WPKernelHooksTransport: jest
		.fn()
		.mockImplementation((level: string) => ({ kind: 'hooks', level })),
}));

const mockedLogLayer = LogLayer as unknown as jest.MockedFunction<
	typeof LogLayer
>;
const mockedSimplePrettyTerminalTransport =
	SimplePrettyTerminalTransport as unknown as jest.MockedFunction<
		typeof SimplePrettyTerminalTransport
	>;
const mockedWPKernelHooksTransport =
	WPKernelHooksTransport as unknown as jest.MockedFunction<
		typeof WPKernelHooksTransport
	>;

describe('createReporterCLI', () => {
	beforeEach(() => {
		logLayerInstances.length = 0;
		mockedLogLayer.mockClear();
		mockedSimplePrettyTerminalTransport.mockClear();
		mockedWPKernelHooksTransport.mockClear();
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		jest.clearAllMocks();
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
