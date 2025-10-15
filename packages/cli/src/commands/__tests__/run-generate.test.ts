import type { Reporter } from '@wpkernel/core/reporter';
import { runGenerate } from '../run-generate';
import { EXIT_CODES } from '../run-generate/types';
import { validateGeneratedImports } from '../run-generate/validation';

import { loadKernelConfig } from '../../config';
import { buildIr } from '../../ir';
import { emitGeneratedArtifacts } from '../../printers';
import { runAdapterExtensions } from '../../adapters';
import {
	KernelError as CoreKernelError,
	type WPKConfigSource,
} from '@wpkernel/core/contracts';

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

jest.mock('../run-generate/validation', () => ({
	validateGeneratedImports: jest.fn(async () => undefined),
}));

jest.mock('@wpkernel/core', () => {
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
const validateGeneratedImportsMock =
	validateGeneratedImports as jest.MockedFunction<
		typeof validateGeneratedImports
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
			version: 1 as const,
			namespace: 'demo',
			schemas: {},
			resources: {},
			adapters: {},
			...(overrides.config ?? {}),
		},
		sourcePath: '/workspace/kernel.config.js',
		configOrigin: 'file' as WPKConfigSource,
		composerCheck: 'ok' as 'ok' | 'mismatch',
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
		validateGeneratedImportsMock.mockResolvedValue(undefined);
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

		// Create and inject a local reporter so we can inspect child calls
		const reporter = createReporterMock();

		const result = await runGenerate({ dryRun: true, reporter });

		expect(result.exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);

		// Cast to jest.Mocked to access mock.calls
		const mockedReporter = reporter as unknown as jest.Mocked<Reporter>;
		const childAdapter = mockedReporter.child(
			'adapter'
		) as unknown as jest.Mocked<Reporter>;
		const errorCalls = childAdapter.error.mock.calls;

		expect(
			errorCalls.some(
				(call: any) =>
					call[0] === 'Adapter extension failure.' &&
					call[1].message === 'extension failure'
			)
		).toBe(true);
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

		// Create and inject a local reporter so we can inspect child calls
		const reporter = createReporterMock();

		const result = await runGenerate({ dryRun: true, reporter });

		expect(result.exitCode).toBe(EXIT_CODES.ADAPTER_ERROR);
		expect(commit).toHaveBeenCalledTimes(1);
		expect(rollback).toHaveBeenCalledTimes(1);

		const mockedReporter = reporter as unknown as jest.Mocked<Reporter>;
		const childAdapter = mockedReporter.child(
			'adapter'
		) as unknown as jest.Mocked<Reporter>;
		const errorCalls = childAdapter.error.mock.calls;

		expect(
			errorCalls.some(
				(call: any) =>
					call[0] === 'Adapter extension commit failed.' &&
					call[1].message === 'commit failure'
			)
		).toBe(true);
	});
});
it('returns exit code 1 when validation fails', async () => {
	validateGeneratedImportsMock.mockRejectedValueOnce(
		new CoreKernelError('ValidationError', { message: 'invalid imports' })
	);

	const reporter = createReporterMock();
	const result = await runGenerate({ reporter });

	expect(result.exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
	expect(validateGeneratedImportsMock).toHaveBeenCalled();
});
