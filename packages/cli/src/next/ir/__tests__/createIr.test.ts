import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createNoopReporter } from '@wpkernel/core/reporter';
import * as reporterExports from '@wpkernel/core/reporter';
import type { KernelConfigV1 } from '../../../config/types';
import { buildIr } from '../../../ir';
import {
	createBaseConfig,
	FIXTURE_CONFIG_PATH,
	FIXTURE_ROOT,
} from '../../../ir/test-helpers';
import { createWorkspace } from '../../workspace';
import * as workspaceExports from '../../workspace';
import { createIr } from '../createIr';

jest.mock('../../builders', () => {
	const { createHelper } = jest.requireActual('../../helper');
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
		createBlocksBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.blocks')
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

		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'php-ir-workspace-')
		);

		try {
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

			const workspace = createWorkspace(workspaceRoot);
			const [legacy, next] = await Promise.all([
				buildIr(options),
				createIr(options, {
					workspace,
					reporter: createNoopReporter(),
				}),
			]);

			expect(next).toEqual(legacy);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
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
		} as unknown as ReturnType<typeof createNoopReporter>;
		reporterChild.mockReturnValue(reporter);

		const ir = await createIr(options, {
			pipeline: pipeline as never,
			workspace,
			reporter,
			phase: 'validate',
		});

		expect(ir).toBe(pipelineRunResult.ir);
		expect(pipeline.ir.use).toHaveBeenCalledTimes(8);
		expect(pipeline.builders.use).toHaveBeenCalledTimes(5);
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
			.spyOn(workspaceExports, 'createWorkspace')
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
		expect(pipeline.ir.use).toHaveBeenCalledTimes(8);
		expect(pipeline.builders.use).toHaveBeenCalledTimes(5);
		expect(pipeline.run).toHaveBeenCalledTimes(1);
		expect(workspaceSpy).toHaveBeenCalledWith(
			path.dirname(options.sourcePath)
		);
		expect(reporterSpy).toHaveBeenCalledTimes(1);

		workspaceSpy.mockRestore();
		reporterSpy.mockRestore();
	});
});
