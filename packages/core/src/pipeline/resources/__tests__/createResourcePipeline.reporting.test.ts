import { createPipeline } from '@wpkernel/pipeline';
import { createResourcePipeline } from '../createResourcePipeline';
import type { Reporter } from '../../../reporter/types';
import type { PipelineDiagnostic } from '@wpkernel/pipeline';
import * as reportingModule from '../../reporting';

type MockPipeline = {
	ir: { use: jest.Mock };
	builders: { use: jest.Mock };
	extensions: { use: jest.Mock };
	run: jest.Mock;
};

jest.mock('@wpkernel/pipeline', () => ({
	createPipeline: jest.fn(),
	createHelper: jest.fn((options) => options),
}));

describe('createResourcePipeline diagnostics reporting', () => {
	const mockPipeline: MockPipeline = {
		ir: { use: jest.fn() },
		builders: { use: jest.fn() },
		extensions: { use: jest.fn() },
		run: jest.fn(),
	};

	const createPipelineMock = createPipeline as jest.MockedFunction<
		typeof createPipeline
	>;

	beforeEach(() => {
		createPipelineMock.mockReturnValue(
			mockPipeline as unknown as ReturnType<typeof createPipeline>
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('forwards diagnostics through reportPipelineDiagnostic', () => {
		const reportSpy = jest.spyOn(
			reportingModule,
			'reportPipelineDiagnostic'
		);

		createResourcePipeline();

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
			type: 'unused-helper',
			key: 'resource.helper',
			message: 'unused helper detected',
			dependsOn: [],
		};

		pipelineOptions?.onDiagnostic?.({ reporter, diagnostic });

		expect(reportSpy).toHaveBeenCalledWith({ reporter, diagnostic });
	});
});
