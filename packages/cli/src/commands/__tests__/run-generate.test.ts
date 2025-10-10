import type { Reporter } from '@geekist/wp-kernel';
import { runGenerate } from '../run-generate';

import { loadKernelConfig } from '../../config';
import { buildIr } from '../../ir';
import { emitGeneratedArtifacts } from '../../printers';
import { runAdapterExtensions } from '../../adapters';
import { createReporter } from '@geekist/wp-kernel';

jest.mock('../../config');
jest.mock('../../ir');
jest.mock('../../printers');
jest.mock('../../adapters');
jest.mock('../../utils', () => ({
	FileWriter: class {
		private writes = 0;

		async write(): Promise<void> {
			this.writes += 1;
		}

		summarise() {
			return {
				counts: {
					written: this.writes,
					unchanged: 0,
					skipped: 0,
				},
				entries: Array.from({ length: this.writes }, (_, index) => ({
					status: 'written' as const,
					path: `file-${index}`,
				})),
			};
		}
	},
}));

jest.mock('prettier', () => ({
	format: jest.fn((contents: string) => contents),
}));

jest.mock('@prettier/plugin-php', () => ({}));

jest.mock('@geekist/wp-kernel', () => {
	class KernelError extends Error {
		public readonly code: string;
		public readonly context?: Record<string, unknown>;
		public readonly data?: Record<string, unknown>;

		constructor(
			code: string,
			payload: {
				message?: string;
				context?: Record<string, unknown>;
				data?: Record<string, unknown>;
			} = {}
		) {
			super(payload.message ?? code);
			this.name = 'KernelError';
			this.code = code;
			this.context = payload.context;
			this.data = payload.data;
		}

		static isKernelError(value: unknown): value is KernelError {
			return value instanceof KernelError;
		}
	}

	return {
		createReporter: jest.fn(() => createReporterMock()),
		KernelError,
	};
});

const loadKernelConfigMock = loadKernelConfig as jest.MockedFunction<
	typeof loadKernelConfig
>;
const buildIrMock = buildIr as jest.MockedFunction<typeof buildIr>;
const emitGeneratedArtifactsMock =
	emitGeneratedArtifacts as jest.MockedFunction<
		typeof emitGeneratedArtifacts
	>;
const runAdapterExtensionsMock = runAdapterExtensions as jest.MockedFunction<
	typeof runAdapterExtensions
>;
const createReporterMockFn = createReporter as jest.MockedFunction<
	typeof createReporter
>;

function createReporterMock(): Reporter {
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		child: jest.fn(() => reporter),
	} as unknown as Reporter;

	return reporter;
}

function createKernelConfig(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		config: {
			version: 1,
			namespace: 'demo',
			schemas: {},
			resources: {},
			adapters: {},
			...overrides.config,
		},
		sourcePath: '/workspace/kernel.config.js',
		configOrigin: 'kernel.config.js',
		composerCheck: 'ok',
		namespace: 'demo',
		...overrides,
	};
}

const DEFAULT_IR = {
	meta: {
		version: 1,
		namespace: 'Demo',
		sourcePath: '/workspace/kernel.config.js',
		origin: 'kernel.config.js',
		sanitizedNamespace: 'Demo',
	},
	schemas: [],
	resources: [],
	policies: [],
	blocks: [],
	php: {
		namespace: 'Demo',
		autoload: 'inc/',
	},
};

describe('runGenerate', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		loadKernelConfigMock.mockResolvedValue(createKernelConfig());
		buildIrMock.mockResolvedValue(DEFAULT_IR as never);
		emitGeneratedArtifactsMock.mockResolvedValue(undefined);
		runAdapterExtensionsMock.mockResolvedValue(undefined as never);
	});

	it('returns exit code 3 when adapter extensions fail', async () => {
		loadKernelConfigMock.mockResolvedValue(
			createKernelConfig({
				config: {
					adapters: {
						extensions: [
							() => ({ name: 'telemetry', apply: jest.fn() }),
						],
					},
				},
			})
		);

		runAdapterExtensionsMock.mockImplementation(() => {
			throw new Error('extension failure');
		});

		const result = await runGenerate({ dryRun: true });

		expect(result.exitCode).toBe(3);
		const reporter = createReporterMockFn.mock.results[0]!.value;
		expect(reporter.error).toHaveBeenCalledWith(
			'Adapter extension failure.',
			expect.objectContaining({ message: 'extension failure' })
		);
	});

	it('returns exit code 3 when committing extensions fails and rolls back', async () => {
		loadKernelConfigMock.mockResolvedValue(
			createKernelConfig({
				config: {
					adapters: {
						extensions: [
							() => ({ name: 'telemetry', apply: jest.fn() }),
						],
					},
				},
			})
		);

		const commit = jest
			.fn()
			.mockRejectedValueOnce(new Error('commit failure'));
		const rollback = jest.fn().mockResolvedValue(undefined);

		runAdapterExtensionsMock.mockResolvedValue({
			ir: DEFAULT_IR,
			commit,
			rollback,
		} as never);

		const result = await runGenerate({ dryRun: true });

		expect(result.exitCode).toBe(3);
		expect(commit).toHaveBeenCalledTimes(1);
		expect(rollback).toHaveBeenCalledTimes(1);
		const reporter = createReporterMockFn.mock.results[0]!.value;
		expect(reporter.error).toHaveBeenCalledWith(
			'Adapter extension commit failed.',
			expect.objectContaining({ message: 'commit failure' })
		);
	});
});
