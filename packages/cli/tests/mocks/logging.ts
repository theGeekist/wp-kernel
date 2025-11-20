import { LogLayer } from 'loglayer';
import { SimplePrettyTerminalTransport } from '@loglayer/transport-simple-pretty-terminal';
import { WPKernelHooksTransport } from '@wpkernel/core/reporter';

export interface LogLayerMockInstance {
	withContext: jest.Mock;
	disableLogging: jest.Mock;
	withMetadata: jest.Mock<
		{
			debug: jest.Mock;
			warn: jest.Mock;
			error: jest.Mock;
			info: jest.Mock;
		},
		[metadata: { context: unknown }]
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
}

export const logLayerInstances: LogLayerMockInstance[] = [];

jest.mock('loglayer', () => ({
	LogLayer: jest.fn().mockImplementation(() => {
		const metadataTarget = {
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		};

		const instance: LogLayerMockInstance = {
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

export const mockedLogLayer = LogLayer as jest.MockedClass<typeof LogLayer>;
export const mockedSimplePrettyTerminalTransport =
	SimplePrettyTerminalTransport as jest.MockedClass<
		typeof SimplePrettyTerminalTransport
	>;
export const mockedWPKernelHooksTransport =
	WPKernelHooksTransport as jest.MockedClass<typeof WPKernelHooksTransport>;

export function resetLogLayerMocks(): void {
	logLayerInstances.length = 0;
	mockedLogLayer.mockClear();
	mockedSimplePrettyTerminalTransport.mockClear();
	mockedWPKernelHooksTransport.mockClear();
}
