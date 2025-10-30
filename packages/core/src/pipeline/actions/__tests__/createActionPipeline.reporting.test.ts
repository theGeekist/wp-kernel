import { createActionPipeline } from '../createActionPipeline';
import type { Reporter } from '../../../reporter/types';
import type { PipelineDiagnostic } from '../../types';
import { createPipeline } from '../../createPipeline';
import * as reportingModule from '../../reporting';
import { resetResolvedActionReporters } from '../../../actions/resolveReporter';

type MockPipeline = {
	ir: { use: jest.Mock };
	builders: { use: jest.Mock };
	run: jest.Mock;
};

jest.mock('../../createPipeline', () => ({
	createPipeline: jest.fn(),
}));

describe('createActionPipeline diagnostics reporting', () => {
	const mockPipeline: MockPipeline = {
		ir: { use: jest.fn() },
		builders: { use: jest.fn() },
		run: jest.fn(),
	};

	const createPipelineMock = createPipeline as jest.MockedFunction<
		typeof createPipeline
	>;

	let originalRuntime: typeof global.__WP_KERNEL_ACTION_RUNTIME__;
	let originalSilentFlag: string | undefined;

	beforeEach(() => {
		originalRuntime = global.__WP_KERNEL_ACTION_RUNTIME__;
		originalSilentFlag = process.env.WPK_SILENT_REPORTERS;
		global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
		createPipelineMock.mockReturnValue(
			mockPipeline as unknown as ReturnType<typeof createPipeline>
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
		resetResolvedActionReporters();
		global.__WP_KERNEL_ACTION_RUNTIME__ = originalRuntime;
		if (typeof originalSilentFlag === 'undefined') {
			delete process.env.WPK_SILENT_REPORTERS;
		} else {
			process.env.WPK_SILENT_REPORTERS = originalSilentFlag;
		}
	});

	it('forwards diagnostics through reportPipelineDiagnostic', () => {
		const reportSpy = jest.spyOn(
			reportingModule,
			'reportPipelineDiagnostic'
		);

		createActionPipeline();

		const pipelineOptions = createPipelineMock.mock.calls[0]?.[0];

		expect(pipelineOptions?.onDiagnostic).toBeDefined();

		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as unknown as Reporter;
		const diagnostic: PipelineDiagnostic = {
			type: 'conflict',
			key: 'test.helper',
			message: 'conflict detected',
			helpers: ['a', 'b'],
			mode: 'extend',
		};

		pipelineOptions?.onDiagnostic?.({ reporter, diagnostic });

		expect(reportSpy).toHaveBeenCalledWith({ reporter, diagnostic });
	});

	it('reuses the fallback reporter between pipeline runs', () => {
		global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

		createActionPipeline();

		const pipelineOptions = createPipelineMock.mock.calls[0]?.[0];

		const runOptions = {
			config: { name: 'test.action', handler: jest.fn() },
			args: {},
			definition: {
				action: { key: 'test', name: 'test.action' },
				namespace: 'wpk/test',
			},
			registry: undefined,
		};

		const firstContext = pipelineOptions?.createContext?.(
			runOptions as never
		);
		const secondContext = pipelineOptions?.createContext?.(
			runOptions as never
		);

		expect(firstContext?.reporter).toBe(secondContext?.reporter);
	});

	it('returns a noop reporter when silent reporting is enabled', () => {
		process.env.WPK_SILENT_REPORTERS = '1';

		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		createActionPipeline();

		const pipelineOptions = createPipelineMock.mock.calls[0]?.[0];
		const runOptions = {
			config: { name: 'test.action', handler: jest.fn() },
			args: {},
			definition: {
				action: { key: 'test', name: 'test.action' },
				namespace: 'wpk/test',
			},
			registry: undefined,
		};

		const context = pipelineOptions?.createContext?.(runOptions as never);

		expect(typeof context?.reporter?.warn).toBe('function');
		context?.reporter?.warn?.('should not log');

		expect(consoleWarnSpy).not.toHaveBeenCalled();

		consoleWarnSpy.mockRestore();
	});
});
