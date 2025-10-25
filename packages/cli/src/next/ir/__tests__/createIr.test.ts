import path from 'node:path';
import fs from 'node:fs/promises';
import { createNoopReporter as buildNoopReporter } from '@wpkernel/core/reporter';
import * as reporterExports from '@wpkernel/core/reporter';
import type { KernelConfigV1 } from '../../../config/types';
import { buildIr } from '../../../ir';
import {
	createBaseConfig,
	FIXTURE_CONFIG_PATH,
	FIXTURE_ROOT,
} from '../../../ir/test-helpers';
import { buildWorkspace } from '../../workspace';
import * as workspaceExports from '../../workspace';
import { createIr } from '../createIr';
import { withWorkspace } from '../../../../tests/workspace.test-support';

jest.mock('../../builders', () => {
	const { createHelper } = jest.requireActual('../../runtime');
	const createStubBuilder = (key: string) =>
		createHelper({
			key,
			kind: 'builder',
			async apply() {
				// Intentionally left blank for offline test execution.
			},
		});

	return {
		createBundler: jest.fn(() =>
			createStubBuilder('builder.generate.stub.bundler')
		),
		createPatcher: jest.fn(() =>
			createStubBuilder('builder.generate.stub.patcher')
		),
		createPhpBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.php')
		),
		createTsBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts')
		),
		createPhpDriverInstaller:
			jest.requireActual('../../builders').createPhpDriverInstaller,
	};
});

jest.setTimeout(60000);

describe('createIr', () => {
	it('reproduces the legacy IR output for a basic configuration', async () => {
		const schemaPath = path.relative(
			path.dirname(FIXTURE_CONFIG_PATH),
			path.join(FIXTURE_ROOT, 'schemas', 'todo.schema.json')
		);

		const config: KernelConfigV1 = {
			version: 1,
			namespace: 'todo-app',
			schemas: {
				todo: {
					path: schemaPath,
					generated: {
						types: './generated/todo.ts',
					},
				},
			},
			resources: {
				todo: {
					name: 'todo',
					schema: 'todo',
					routes: {
						list: {
							path: '/todo-app/v1/todo',
							method: 'GET',
							policy: 'manage_todo',
						},
					},
					cacheKeys: {
						list: () => ['todo', 'list'],
						get: (id: string | number) => ['todo', 'get', id],
					},
				},
			},
		} as KernelConfigV1;

		await withWorkspace(
			async (workspaceRoot) => {
				await fs.cp(FIXTURE_ROOT, workspaceRoot, { recursive: true });

				const copiedConfigPath = path.join(
					workspaceRoot,
					path.basename(FIXTURE_CONFIG_PATH)
				);

				const options = {
					config,
					namespace: config.namespace,
					origin: 'typescript',
					sourcePath: copiedConfigPath,
				} as const;

				const workspace = buildWorkspace(workspaceRoot);
				const [legacy, next] = await Promise.all([
					buildIr(options),
					createIr(options, {
						workspace,
						reporter: buildNoopReporter(),
					}),
				]);

				const legacyWithDiagnostics = legacy as typeof next;
				const { diagnostics: legacyDiagnostics, ...legacyRest } =
					legacyWithDiagnostics;
				const { diagnostics: nextDiagnostics, ...nextRest } = next;

				expect(legacyDiagnostics).toBeUndefined();
				expect(nextRest).toEqual(legacyRest);
				expect(nextDiagnostics).toBeDefined();
			},
			{ chdir: false }
		);
	});

	it('collects diagnostics generated during IR construction', async () => {
		const config = createBaseConfig();
		config.resources = {
			remote: {
				name: 'remote',
				schema: 'auto',
				routes: {
					list: {
						path: '/external/items',
						method: 'GET',
					},
				},
			},
		} as KernelConfigV1['resources'];

		await withWorkspace(
			async (workspaceRoot) => {
				const options = {
					config,
					namespace: config.namespace,
					origin: 'typescript',
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				} as const;

				const workspace = buildWorkspace(workspaceRoot);
				const ir = await createIr(options, {
					workspace,
					reporter: buildNoopReporter(),
				});

				expect(ir.diagnostics).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							key: expect.stringContaining(
								'ir.diagnostics.core:resource:remote:route.remote.namespace'
							),
							severity: 'warn',
						}),
					])
				);
			},
			{ chdir: false }
		);
	});

	it('uses provided pipeline, environment workspace and reporter overrides', async () => {
		const config = createBaseConfig();
		const options = {
			config,
			namespace: config.namespace,
			origin: 'test-origin',
			sourcePath: path.join(process.cwd(), 'kernel.config.ts'),
		} as const;

		const pipelineRunResult = {
			ir: { meta: { namespace: config.namespace } },
		} as const;
		const pipeline = {
			ir: { use: jest.fn() },
			builders: { use: jest.fn() },
			extensions: { use: jest.fn() },
			run: jest.fn(async (input) => {
				expect(input.phase).toBe('validate');
				expect(input.workspace).toBe(workspace);
				expect(input.reporter).toBe(reporter);

				return pipelineRunResult;
			}),
		};

		const workspace = { root: '/tmp/custom-workspace' } as unknown;
		const reporterChild = jest.fn();
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: reporterChild,
		} as unknown as ReturnType<typeof buildNoopReporter>;
		reporterChild.mockReturnValue(reporter);

		const ir = await createIr(options, {
			pipeline: pipeline as never,
			workspace,
			reporter,
			phase: 'validate',
		});

		expect(ir).toBe(pipelineRunResult.ir);
		expect(pipeline.ir.use).toHaveBeenCalledTimes(9);
		expect(pipeline.builders.use).toHaveBeenCalledTimes(5);
		expect(pipeline.extensions.use).toHaveBeenCalledTimes(1);
		expect(pipeline.run).toHaveBeenCalledTimes(1);
	});

	it('falls back to creating workspace and reporter when overrides are absent', async () => {
		const config = createBaseConfig();
		const options = {
			config,
			namespace: config.namespace,
			origin: 'test-origin',
			sourcePath: path.join(process.cwd(), 'configs', 'kernel.config.ts'),
		} as const;

		const createdWorkspace = {
			root: '/tmp/generated-workspace',
		} as unknown;
		const createdReporterChild = jest.fn();
		const createdReporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: createdReporterChild,
		} as unknown;
		createdReporterChild.mockReturnValue(createdReporter);

		const workspaceSpy = jest
			.spyOn(workspaceExports, 'buildWorkspace')
			.mockReturnValue(createdWorkspace as never);
		const reporterSpy = jest
			.spyOn(reporterExports, 'createNoopReporter')
			.mockReturnValue(createdReporter as never);

		const pipelineRunResult = {
			ir: { meta: { namespace: config.namespace } },
		} as const;
		const pipeline = {
			ir: { use: jest.fn() },
			builders: { use: jest.fn() },
			extensions: { use: jest.fn() },
			run: jest.fn(async (input) => {
				expect(input.workspace).toBe(createdWorkspace);
				expect(input.reporter).toBe(createdReporter);
				expect(input.phase).toBe('generate');
				expect(input.sourcePath).toBe(options.sourcePath);
				expect(input.namespace).toBe(options.namespace);

				return pipelineRunResult;
			}),
		};

		const ir = await createIr(options, { pipeline: pipeline as never });

		expect(ir).toBe(pipelineRunResult.ir);
		expect(pipeline.ir.use).toHaveBeenCalledTimes(9);
		expect(pipeline.builders.use).toHaveBeenCalledTimes(5);
		expect(pipeline.extensions.use).toHaveBeenCalledTimes(1);
		expect(pipeline.run).toHaveBeenCalledTimes(1);
		expect(workspaceSpy).toHaveBeenCalledWith(
			path.dirname(options.sourcePath)
		);
		expect(reporterSpy).toHaveBeenCalledTimes(1);

		workspaceSpy.mockRestore();
		reporterSpy.mockRestore();
	});
});
