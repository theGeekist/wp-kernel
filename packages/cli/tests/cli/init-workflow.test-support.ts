import { WPK_CONFIG_SOURCES, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { DependencyResolution } from '../../src/commands/init/dependency-versions';
import type { ScaffoldFileDescriptor } from '../../src/commands/init/utils';
import type { writeScaffoldFiles } from '../../src/commands/init/scaffold';

export const scaffoldMocks = {
	assertNoCollisions: jest.fn(),
	buildPathsReplacement: jest.fn(),
	buildReplacementMap: jest.fn(),
	buildScaffoldDescriptors: jest.fn(),
	writeScaffoldFiles: jest.fn(),
};

const packageJsonActual = jest.requireActual(
	'../../src/commands/init/package-json'
);
export const packageJsonMocks = {
	...packageJsonActual,
	writePackageJson: jest.fn(),
};

export const dependencyMocks = {
	resolveDependencyVersions: jest.fn(),
};

export const installerMocks = {
	installNodeDependencies: jest.fn(),
	installComposerDependencies: jest.fn(),
};

const timingActual = jest.requireActual('../../src/commands/init/timing');
export const timingMocks = {
	measureStage: jest.fn(),
	resolveInstallBudgets: jest.fn(),
};

export const assertNoCollisionsMock = scaffoldMocks.assertNoCollisions;
export const buildPathsReplacementMock = scaffoldMocks.buildPathsReplacement;
export const buildReplacementMapMock = scaffoldMocks.buildReplacementMap;
export const buildScaffoldDescriptorsMock =
	scaffoldMocks.buildScaffoldDescriptors;
export const writeScaffoldFilesMock = scaffoldMocks.writeScaffoldFiles;

export const writePackageJsonMock =
	packageJsonMocks.writePackageJson as jest.Mock;

export const resolveDependencyVersionsMock =
	dependencyMocks.resolveDependencyVersions as jest.Mock<
		Promise<DependencyResolution>,
		[unknown, unknown]
	>;

export const installNodeDependenciesMock =
	installerMocks.installNodeDependencies;
export const installComposerDependenciesMock =
	installerMocks.installComposerDependencies;

export const measureStageMock = timingMocks.measureStage;
export const resolveInstallBudgetsMock = timingMocks.resolveInstallBudgets;

interface DefaultsConfig {
	dependencyResolution: DependencyResolution;
	scaffoldDescriptors: ScaffoldFileDescriptor[];
	writeSummary: Awaited<ReturnType<typeof writeScaffoldFiles>>;
}

const DEFAULTS: DefaultsConfig = {
	dependencyResolution: {
		source: 'registry',
		sources: ['fallback', 'registry'],
		dependencies: {},
		devDependencies: {},
		peerDependencies: {},
	},
	scaffoldDescriptors: [
		{
			relativePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			templatePath: `${WPK_NAMESPACE}/${WPK_CONFIG_SOURCES.WPK_CONFIG_TS}`,
			category: 'wpk',
		},
	],
	writeSummary: [
		{ path: WPK_CONFIG_SOURCES.WPK_CONFIG_TS, status: 'created' },
	],
};

export function resetInitWorkflowMocks(
	defaults: Partial<DefaultsConfig> = {}
): void {
	const config = { ...DEFAULTS, ...defaults };
	jest.clearAllMocks();

	buildScaffoldDescriptorsMock.mockReturnValue(config.scaffoldDescriptors);
	writeScaffoldFilesMock.mockResolvedValue(config.writeSummary);
	assertNoCollisionsMock.mockResolvedValue({ skipped: [] });
	buildPathsReplacementMock.mockResolvedValue('"{}"');
	buildReplacementMapMock.mockReturnValue(new Map());
	writePackageJsonMock.mockResolvedValue('updated');
	resolveDependencyVersionsMock.mockResolvedValue(
		config.dependencyResolution
	);
	installNodeDependenciesMock.mockResolvedValue({ stdout: '', stderr: '' });
	installComposerDependenciesMock.mockResolvedValue({
		stdout: '',
		stderr: '',
	});
	resolveInstallBudgetsMock.mockReturnValue({
		node: timingActual.DEFAULT_NODE_INSTALL_BUDGET_MS,
		composer: timingActual.DEFAULT_COMPOSER_INSTALL_BUDGET_MS,
	});
	measureStageMock.mockImplementation(async ({ run, budgetMs }) => {
		await run();
		return { durationMs: 0, budgetMs };
	});
}
