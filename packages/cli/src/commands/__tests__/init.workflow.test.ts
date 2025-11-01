import { createReporterMock } from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { runInitWorkflow } from '../init/workflow';
import type { InitWorkflowOptions } from '../init/workflow';
import {
	assertNoCollisions,
	buildPathsReplacement,
	buildReplacementMap,
	buildScaffoldDescriptors,
	writeScaffoldFiles,
} from '../init/scaffold';
import { writePackageJson } from '../init/package-json';
import { resolveDependencyVersions } from '../init/dependency-versions';
import type { DependencyResolution } from '../init/dependency-versions';
import type { Workspace } from '../../next/workspace';

type WriteScaffoldFiles = typeof writeScaffoldFiles;
type BuildScaffoldDescriptors = typeof buildScaffoldDescriptors;
type BuildReplacementMap = typeof buildReplacementMap;
type BuildPathsReplacement = typeof buildPathsReplacement;
type WritePackageJson = typeof writePackageJson;

type Resolver = typeof resolveDependencyVersions;

jest.mock('../init/scaffold', () => ({
	assertNoCollisions: jest.fn(),
	buildPathsReplacement: jest.fn(),
	buildReplacementMap: jest.fn(),
	buildScaffoldDescriptors: jest.fn(),
	writeScaffoldFiles: jest.fn(),
}));

jest.mock('../init/package-json', () => {
	const actual = jest.requireActual('../init/package-json');
	return {
		...actual,
		writePackageJson: jest.fn(),
	} satisfies Partial<typeof actual>;
});

jest.mock('../init/dependency-versions', () => ({
	resolveDependencyVersions: jest.fn(),
}));

const resolveDependencyVersionsMock =
	resolveDependencyVersions as jest.MockedFunction<Resolver>;
const writeScaffoldFilesMock =
	writeScaffoldFiles as jest.MockedFunction<WriteScaffoldFiles>;
const assertNoCollisionsMock = assertNoCollisions as jest.MockedFunction<
	typeof assertNoCollisions
>;
const buildScaffoldDescriptorsMock =
	buildScaffoldDescriptors as jest.MockedFunction<BuildScaffoldDescriptors>;
const buildReplacementMapMock =
	buildReplacementMap as jest.MockedFunction<BuildReplacementMap>;
const buildPathsReplacementMock =
	buildPathsReplacement as jest.MockedFunction<BuildPathsReplacement>;
const writePackageJsonMock =
	writePackageJson as jest.MockedFunction<WritePackageJson>;

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return makeWorkspaceMock({
		commit: jest.fn(async () => ({ writes: [], deletes: [] })),
		rollback: jest.fn(async () => ({ writes: [], deletes: [] })),
		...overrides,
	});
}

describe('runInitWorkflow', () => {
	const dependencyResolution: DependencyResolution = {
		source: 'registry',
		sources: ['fallback', 'registry'],
		dependencies: {},
		devDependencies: {},
		peerDependencies: {},
	};

	beforeEach(() => {
		jest.clearAllMocks();

		buildScaffoldDescriptorsMock.mockReturnValue([
			{
				relativePath: 'wpk.config.ts',
				templatePath: 'wpk/wpk.config.ts',
				category: 'wpk',
			},
		]);
		writeScaffoldFilesMock.mockResolvedValue([
			{ path: 'wpk.config.ts', status: 'created' },
		]);
		assertNoCollisionsMock.mockResolvedValue({ skipped: [] });
		buildPathsReplacementMock.mockResolvedValue('"{}"');
		buildReplacementMapMock.mockReturnValue(new Map());
		writePackageJsonMock.mockResolvedValue('updated');
		resolveDependencyVersionsMock.mockResolvedValue(dependencyResolution);
	});

	it('logs dependency resolution details when verbose and env requests registry versions', async () => {
		const commit = jest.fn(async () => ({ writes: [], deletes: [] }));
		const workspace = createWorkspace({ commit });
		const reporter = createReporterMock();

		const options: InitWorkflowOptions = {
			workspace,
			reporter,
			projectName: 'Demo Project',
			template: 'plugin',
			force: false,
			verbose: true,
			preferRegistryVersionsFlag: false,
			env: { WPK_PREFER_REGISTRY_VERSIONS: 'true' },
		};

		const result = await runInitWorkflow(options);

		expect(resolveDependencyVersionsMock).toHaveBeenCalledWith(
			workspace.root,
			expect.objectContaining({
				preferRegistryVersions: true,
			})
		);
		expect(writeScaffoldFilesMock).toHaveBeenCalledWith(
			expect.objectContaining({ force: false, skip: undefined })
		);
		expect(reporter.info).toHaveBeenCalledWith(
			'init dependency versions resolved from registry'
		);
		expect(commit).toHaveBeenCalledWith('init');
		expect(result.summaries).toContainEqual({
			path: 'package.json',
			status: 'updated',
		});
		expect(result.summaryText).toContain('demo-project');
	});

	it('rolls back workspace changes when the workflow throws', async () => {
		const rollback = jest.fn(async () => ({ writes: [], deletes: [] }));
		const workspace = createWorkspace({ rollback });
		const reporter = createReporterMock();

		writeScaffoldFilesMock.mockRejectedValueOnce(
			new Error('scaffold failed')
		);

		await expect(
			runInitWorkflow({
				workspace,
				reporter,
				verbose: false,
			})
		).rejects.toThrow('scaffold failed');

		expect(rollback).toHaveBeenCalledWith('init');
		expect(reporter.info).not.toHaveBeenCalled();
	});
});
