import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@cli-tests/cli';
import { createReporterFactory } from '@cli-tests/reporter';
import { buildDoctorCommand, renderDoctorSummary } from '../doctor';
import type {
	ReadinessHelperDescriptor,
	ReadinessOutcome,
	ReadinessOutcomeStatus,
	ReadinessPlan,
	ReadinessRegistry,
	ReadinessDetection,
	ReadinessConfirmation,
} from '../../dx';

describe('buildDoctorCommand', () => {
	let reporterFactory: jest.Mock;
	let loadWPKernelConfig: jest.Mock;
	let buildWorkspace: jest.Mock;
	let buildReadinessRegistry: jest.Mock;
	let readinessPlanRun: jest.Mock;
	let readinessPlan: ReadinessPlan;
	let readinessRegistry: ReadinessRegistry;
	let readinessRegistryPlan: jest.Mock;
	let readinessDescriptors: ReadinessHelperDescriptor[];

	beforeEach(() => {
		reporterFactory = createReporterFactory();
		loadWPKernelConfig = jest.fn();
		buildWorkspace = jest.fn();
		readinessPlanRun = jest.fn();

		readinessDescriptors = [
			{
				key: 'workspace-hygiene',
				metadata: { label: 'Workspace hygiene', scopes: ['doctor'] },
			},
			{
				key: 'composer',
				metadata: {
					label: 'Composer dependencies',
					scopes: ['doctor'],
				},
			},
			{
				key: 'php-runtime',
				metadata: { label: 'PHP runtime', scopes: ['doctor'] },
			},
			{
				key: 'php-printer-path',
				metadata: { label: 'PHP printer path', scopes: ['doctor'] },
			},
		];

		const expectedKeys = readinessDescriptors.map(
			(descriptor) => descriptor.key
		);

		readinessPlan = {
			keys: expectedKeys,
			run: (context) => readinessPlanRun(context),
		} as ReadinessPlan;
		readinessRegistryPlan = jest.fn(() => readinessPlan);
		readinessRegistry = {
			plan: readinessRegistryPlan,
			register: jest.fn(),
			describe: jest.fn(() => readinessDescriptors),
		} as unknown as ReadinessRegistry;
		buildReadinessRegistry = jest.fn(() => readinessRegistry);

		const configPath = path.join(process.cwd(), 'wpk.config.ts');
		loadWPKernelConfig.mockResolvedValue({
			config: {},
			sourcePath: configPath,
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\',
		});
		buildWorkspace.mockReturnValue({ root: process.cwd() });

		setReadinessOutcomes([
			createReadinessOutcome(
				'workspace-hygiene',
				'ready',
				'Workspace clean.'
			),
			createReadinessOutcome('composer', 'ready', 'Composer ready.'),
			createReadinessOutcome('php-runtime', 'ready', 'Runtime ok.'),
			createReadinessOutcome(
				'php-printer-path',
				'ready',
				'Printer path ok.'
			),
		]);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returns success when all checks pass', async () => {
		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[PASS] Kernel config');
		expect(stdout.toString()).toContain(
			'[PASS] Workspace hygiene: Workspace clean.'
		);
		expect(stdout.toString()).toContain(
			'[PASS] Composer dependencies: Composer ready.'
		);
		expect(stdout.toString()).toContain('[PASS] PHP runtime: Runtime ok.');
		expect(stdout.toString()).toContain(
			'[PASS] PHP printer path: Printer path ok.'
		);
		expect(readinessRegistryPlan).toHaveBeenCalledWith(
			readinessDescriptors.map((descriptor) => descriptor.key)
		);
		expect(readinessPlanRun).toHaveBeenCalledTimes(1);
	});

	it('returns failure when wpk config fails to load', async () => {
		loadWPKernelConfig.mockRejectedValueOnce(new Error('missing config'));

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toContain('[FAIL] Kernel config');
		expect(buildWorkspace).not.toHaveBeenCalled();
		expect(readinessPlanRun).toHaveBeenCalledTimes(1);
	});

	it('returns failure when PHP printer readiness fails', async () => {
		setReadinessOutcomes([
			createReadinessOutcome(
				'workspace-hygiene',
				'ready',
				'Workspace clean.'
			),
			createReadinessOutcome('composer', 'ready', 'Composer ready.'),
			createReadinessOutcome('php-runtime', 'ready', 'Runtime ok.'),
			createReadinessOutcome(
				'php-printer-path',
				'pending',
				'Printer missing',
				'pending',
				'pending'
			),
		]);

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toContain(
			'[FAIL] PHP printer path: Printer missing'
		);
		expect(readinessPlanRun).toHaveBeenCalledTimes(1);
	});

	it('continues execution when workspace hygiene readiness blocks', async () => {
		setReadinessOutcomes([
			createReadinessOutcome(
				'workspace-hygiene',
				'blocked',
				'Workspace unresolved.',
				'blocked',
				null
			),
			createReadinessOutcome('composer', 'ready', 'Composer ready.'),
			createReadinessOutcome('php-runtime', 'ready', 'Runtime ok.'),
			createReadinessOutcome(
				'php-printer-path',
				'ready',
				'Printer path ok.'
			),
		]);

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain(
			'[WARN] Workspace hygiene: Workspace unresolved.'
		);
	});

	it('warns when workspace cannot be resolved', async () => {
		buildWorkspace.mockReturnValueOnce(null as unknown as { root: string });
		setReadinessOutcomes([
			createReadinessOutcome(
				'workspace-hygiene',
				'blocked',
				'Workspace unresolved.',
				'blocked',
				null
			),
			createReadinessOutcome('composer', 'ready', 'Composer ready.'),
			createReadinessOutcome('php-runtime', 'ready', 'Runtime ok.'),
			createReadinessOutcome(
				'php-printer-path',
				'ready',
				'Printer path ok.'
			),
		]);

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain(
			'[WARN] Workspace hygiene: Workspace unresolved.'
		);
	});

	function setReadinessOutcomes(outcomes: ReadinessOutcome[]) {
		readinessPlanRun.mockResolvedValue({ outcomes });
	}
});

describe('renderDoctorSummary', () => {
	it('returns fallback when no checks executed', () => {
		expect(renderDoctorSummary([])).toBe(
			'Health checks:\n- No checks executed.\n'
		);
	});

	it('formats unknown statuses with fallback label', () => {
		const summary = renderDoctorSummary([
			{
				key: 'mystery',
				label: 'Mystery check',
				status: 'mystery',
				message: '???',
			} as unknown as {
				key: string;
				label: string;
				status: 'pass';
				message: string;
			},
		]);

		expect(summary).toContain('[UNKNOWN] Mystery check: ???');
	});
});

function createReadinessOutcome(
	key: ReadinessKey,
	status: ReadinessOutcomeStatus,
	message: string,
	detectionStatus: ReadinessDetection<unknown>['status'] = 'ready',
	confirmationStatus:
		| ReadinessConfirmation<unknown>['status']
		| null = 'ready'
): ReadinessOutcome {
	const state = {} as Record<string, never>;
	const detection: ReadinessDetection<unknown> = {
		status: detectionStatus,
		state,
		message,
	};
	const confirmation =
		confirmationStatus === null
			? undefined
			: ({
					status: confirmationStatus,
					state,
					message,
				} as ReadinessConfirmation<unknown>);

	return {
		key,
		status,
		detection,
		confirmation,
	} as ReadinessOutcome;
}
