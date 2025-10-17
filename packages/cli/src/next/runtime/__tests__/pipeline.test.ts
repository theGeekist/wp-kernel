import { createReporterMock } from '@wpkernel/test-utils/cli';
import type { IRPolicyMap } from '../../../ir/types';
import { KernelError } from '@wpkernel/core/error';
import { createHelper } from '../../helper';
import { createPipeline } from '../createPipeline';
import type { KernelConfigV1 } from '../../../config/types';
import { FIXTURE_CONFIG_PATH } from '../../../ir/test-helpers';
import { createWorkspace } from '../../workspace';
import { withWorkspace } from '../../../../tests/workspace.test-support';

function createPolicyMap(): IRPolicyMap {
	return {
		sourcePath: undefined,
		definitions: [],
		fallback: { capability: 'manage_options', appliesTo: 'resource' },
		missing: [],
		unused: [],
		warnings: [],
	};
}

describe('createPipeline', () => {
	const config: KernelConfigV1 = {
		version: 1,
		namespace: 'test-namespace',
		schemas: {},
		resources: {},
	};

	const runWithWorkspace = (
		run: (workspaceRoot: string) => Promise<void>
	): Promise<void> => withWorkspace(run, { chdir: false });

	it('orders helpers by dependency metadata and executes builders', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const runOrder: string[] = [];

			const metaHelper = createHelper({
				key: 'ir.meta.test',
				kind: 'fragment',
				mode: 'override',
				apply({ output }) {
					runOrder.push('meta');
					output.assign({
						meta: {
							version: 1,
							namespace: 'test-namespace',
							sanitizedNamespace: 'test-namespace',
							origin: 'typescript',
							sourcePath: 'config.ts',
						},
						php: {
							namespace: 'TestNamespace',
							autoload: 'inc/',
							outputDir: '.generated/php',
						},
					});
				},
			});

			const collectionHelper = createHelper({
				key: 'ir.collection.test',
				kind: 'fragment',
				dependsOn: ['ir.meta.test'],
				apply({ output }) {
					runOrder.push('collection');
					output.assign({
						schemas: [],
						resources: [],
						policies: [],
						blocks: [],
					});
				},
			});

			const policyHelper = createHelper({
				key: 'ir.policy-map.test',
				kind: 'fragment',
				dependsOn: ['ir.collection.test'],
				apply({ output }) {
					runOrder.push('policy');
					output.assign({ policyMap: createPolicyMap() });
				},
			});

			const validationHelper = createHelper({
				key: 'ir.validation.test',
				kind: 'fragment',
				dependsOn: ['ir.policy-map.test'],
				apply() {
					runOrder.push('validation');
				},
			});

			const builderHelper = createHelper({
				key: 'builder.test',
				kind: 'builder',
				apply({ reporter }, next) {
					runOrder.push('builder');
					reporter.debug('builder executed');
					return next?.();
				},
			});

			pipeline.ir.use(metaHelper);
			pipeline.ir.use(collectionHelper);
			pipeline.ir.use(policyHelper);
			pipeline.ir.use(validationHelper);
			pipeline.builders.use(builderHelper);

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();
			const { steps, ir } = await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'test-namespace',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter,
			});

			expect(ir.meta.namespace).toBe('test-namespace');
			expect(runOrder).toEqual([
				'meta',
				'collection',
				'policy',
				'validation',
				'builder',
			]);
			expect(steps.map((step) => step.key)).toEqual([
				'ir.meta.test',
				'ir.collection.test',
				'ir.policy-map.test',
				'ir.validation.test',
				'builder.test',
			]);
		});
	});

	it('throws when multiple overrides register for the same key', async () => {
		const pipeline = createPipeline();

		pipeline.ir.use(
			createHelper({
				key: 'ir.meta.test',
				kind: 'fragment',
				mode: 'override',
				apply() {
					return Promise.resolve();
				},
			})
		);

		expect(() =>
			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.test',
					kind: 'fragment',
					mode: 'override',
					apply() {
						return Promise.resolve();
					},
				})
			)
		).toThrow(/Multiple overrides/);
	});

	it('rejects helpers registered under the wrong surface', () => {
		const pipeline = createPipeline();

		expect(() =>
			pipeline.ir.use(
				createHelper({
					key: 'builder.wrong-surface',
					kind: 'builder',
					apply() {
						return Promise.resolve();
					},
				})
			)
		).toThrow(/Attempted to register helper/);

		expect(() =>
			pipeline.builders.use(
				createHelper({
					key: 'ir.wrong-surface',
					kind: 'fragment',
					apply() {
						return Promise.resolve();
					},
				})
			)
		).toThrow(/Attempted to register helper/);
	});

	it('detects dependency cycles when ordering helpers', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();

			pipeline.ir.use(
				createHelper({
					key: 'ir.first',
					kind: 'fragment',
					dependsOn: ['ir.second'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.second',
					kind: 'fragment',
					dependsOn: ['ir.first'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await expect(
				pipeline.run({
					phase: 'generate',
					config,
					namespace: 'cycle',
					origin: 'typescript',
					sourcePath: FIXTURE_CONFIG_PATH,
					workspace,
					reporter,
				})
			).rejects.toThrow(KernelError);
		});
	});

	it('supports top-level helper registration and extensions', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const executionOrder: string[] = [];

			const metaHelper = createHelper({
				key: 'ir.meta.inline',
				kind: 'fragment',
				mode: 'override',
				apply({ output }) {
					executionOrder.push('meta');
					output.assign({
						meta: {
							version: 1,
							namespace: 'ext',
							sanitizedNamespace: 'ext',
							origin: 'typescript',
							sourcePath: 'config.ts',
						},
						php: {
							namespace: 'Ext',
							autoload: 'inc/',
							outputDir: '.generated/php',
						},
					});
				},
			});

			const policyHelper = createHelper({
				key: 'ir.policy-map.inline',
				kind: 'fragment',
				dependsOn: ['ir.meta.inline'],
				apply({ output }) {
					executionOrder.push('policy');
					output.assign({ policyMap: createPolicyMap() });
				},
			});

			const builderHelper = createHelper({
				key: 'builder.inline',
				kind: 'builder',
				apply({ reporter }) {
					reporter.info('inline builder');
					executionOrder.push('builder.inline');
				},
			});

			const extensionBuilder = createHelper({
				key: 'builder.extension',
				kind: 'builder',
				apply() {
					executionOrder.push('builder.extension');
				},
			});

			pipeline.use(metaHelper);
			pipeline.use(builderHelper);
			pipeline.ir.use(policyHelper);
			const extensionResult = pipeline.extensions.use({
				register(pipe) {
					pipe.builders.use(extensionBuilder);
					return 'registered';
				},
			});

			expect(extensionResult).toBe('registered');

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();
			const { steps } = await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'ext',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter,
			});

			expect(executionOrder.slice(0, 2)).toEqual(['meta', 'policy']);
			expect(new Set(executionOrder.slice(2))).toEqual(
				new Set(['builder.inline', 'builder.extension'])
			);
			expect(steps.map((step) => step.key)).toContain(
				'builder.extension'
			);
		});
	});

	it('awaits asynchronous extension registration before execution', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn(async () => undefined);
			const rollback = jest.fn(async () => undefined);
			const hookSpy = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.async',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'async',
								sanitizedNamespace: 'Async',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'Async',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.async',
					kind: 'fragment',
					dependsOn: ['ir.meta.async'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.async',
					kind: 'fragment',
					dependsOn: ['ir.resources.async'],
					apply() {
						// validation no-op
					},
				})
			);

			await pipeline.extensions.use({
				key: 'extension.async',
				async register() {
					return async (options) => {
						hookSpy(options.ir.meta.namespace);
						return { commit, rollback };
					};
				},
			});

			pipeline.builders.use(
				createHelper({
					key: 'builder.async',
					kind: 'builder',
					apply({ reporter }, next) {
						reporter.debug('async builder executed');
						return next?.();
					},
				})
			);

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'async',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter,
			});

			expect(hookSpy).toHaveBeenCalledWith('async');
			expect(commit).toHaveBeenCalledTimes(1);
			expect(rollback).not.toHaveBeenCalled();
		});
	});

	it('applies extension IR updates and records builder writes', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn(async () => undefined);
			const recordedActions: string[] = [];

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.update',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'initial',
								sanitizedNamespace: 'Initial',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'Initial',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.collection.update',
					kind: 'fragment',
					dependsOn: ['ir.meta.update'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.update',
					kind: 'fragment',
					dependsOn: ['ir.collection.update'],
					apply() {
						// validation no-op
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.ir-update',
				register() {
					return async ({ ir }) => ({
						ir: {
							...ir,
							meta: {
								...ir.meta,
								namespace: 'updated',
								sanitizedNamespace: 'Updated',
							},
						},
						commit,
					});
				},
			});

			pipeline.builders.use(
				createHelper({
					key: 'builder.writer',
					kind: 'builder',
					apply({ output }) {
						output.queueWrite({
							file: 'generated.txt',
							contents: 'generated',
						});
						recordedActions.push('generated.txt');
					},
				})
			);

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			const result = await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'update',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter,
			});

			expect(result.ir.meta.namespace).toBe('updated');
			expect(commit).toHaveBeenCalledTimes(1);
			expect(recordedActions).toEqual(['generated.txt']);
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('orders builder helpers by priority, key, and registration order', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const builderOrder: string[] = [];

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.priority',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'priority',
								sanitizedNamespace: 'Priority',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'Priority',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.collection.priority',
					kind: 'fragment',
					dependsOn: ['ir.meta.priority'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.policy-map.priority',
					kind: 'fragment',
					dependsOn: ['ir.collection.priority'],
					apply({ output }) {
						output.assign({ policyMap: createPolicyMap() });
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.priority',
					kind: 'fragment',
					dependsOn: ['ir.policy-map.priority'],
					apply() {
						// no-op validation stub
					},
				})
			);

			const builderHigh = createHelper({
				key: 'builder.high-priority',
				kind: 'builder',
				priority: 5,
				async apply({ reporter }, next) {
					builderOrder.push('high');
					reporter.debug('high priority builder executed');
					await next?.();
				},
			});

			const builderAlpha = createHelper({
				key: 'builder.alpha',
				kind: 'builder',
				priority: 1,
				async apply({ reporter }, next) {
					builderOrder.push('alpha');
					reporter.debug('alpha builder executed');
					await next?.();
					await next?.();
				},
			});

			const builderBeta = createHelper({
				key: 'builder.beta',
				kind: 'builder',
				priority: 1,
				apply({ reporter }) {
					builderOrder.push('beta');
					reporter.debug('beta builder executed');
				},
			});

			const duplicateFirst = createHelper({
				key: 'builder.duplicate',
				kind: 'builder',
				async apply({ reporter }, next) {
					builderOrder.push('duplicate-1');
					reporter.debug('duplicate builder (first) executed');
					await next?.();
				},
			});

			const duplicateSecond = createHelper({
				key: 'builder.duplicate',
				kind: 'builder',
				async apply({ reporter }, next) {
					builderOrder.push('duplicate-2');
					reporter.debug('duplicate builder (second) executed');
					await next?.();
				},
			});

			pipeline.builders.use(duplicateFirst);
			pipeline.builders.use(builderBeta);
			pipeline.builders.use(builderHigh);
			pipeline.builders.use(duplicateSecond);
			pipeline.builders.use(builderAlpha);

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();
			const { steps } = await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'priority',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter,
			});

			expect(builderOrder).toEqual([
				'high',
				'alpha',
				'beta',
				'duplicate-1',
				'duplicate-2',
			]);

			const builderSteps = steps.filter(
				(step) => step.kind === 'builder'
			);
			expect(builderSteps.map((step) => step.key)).toEqual([
				'builder.high-priority',
				'builder.alpha',
				'builder.beta',
				'builder.duplicate',
				'builder.duplicate',
			]);
		});
	});

	it('commits extension hooks after successful execution', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn();
			const rollback = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.commit',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'commit',
								sanitizedNamespace: 'commit',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'Commit',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.commit',
					kind: 'fragment',
					dependsOn: ['ir.meta.commit'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.commit',
					kind: 'fragment',
					dependsOn: ['ir.resources.commit'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.commit',
					kind: 'builder',
					async apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.commit',
				register() {
					return async () => ({
						commit,
						rollback,
					});
				},
			});

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'commit',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter,
			});

			expect(commit).toHaveBeenCalledTimes(1);
			expect(rollback).not.toHaveBeenCalled();
		});
	});

	it('rolls back executed extension hooks when a later hook throws', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn();
			const rollback = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.extension-failure',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'extension-failure',
								sanitizedNamespace: 'ExtensionFailure',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'ExtensionFailure',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.extension-failure',
					kind: 'fragment',
					dependsOn: ['ir.meta.extension-failure'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.extension-failure',
					kind: 'fragment',
					dependsOn: ['ir.resources.extension-failure'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback-before-throw',
				register() {
					return async () => ({
						commit,
						rollback,
					});
				},
			});

			pipeline.extensions.use({
				key: 'extension.throwing',
				register() {
					return async () => {
						throw new Error('extension failure');
					};
				},
			});

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await expect(
				pipeline.run({
					phase: 'generate',
					config,
					namespace: 'extension-failure',
					origin: 'typescript',
					sourcePath: FIXTURE_CONFIG_PATH,
					workspace,
					reporter,
				})
			).rejects.toThrow('extension failure');

			expect(commit).not.toHaveBeenCalled();
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('rolls back extension hooks when builders fail', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn();
			const rollback = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.rollback',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'rollback',
								sanitizedNamespace: 'rollback',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'Rollback',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.rollback',
					kind: 'fragment',
					dependsOn: ['ir.meta.rollback'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.rollback',
					kind: 'fragment',
					dependsOn: ['ir.resources.rollback'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.rollback',
					kind: 'builder',
					async apply() {
						throw new Error('builder failure');
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback',
				register() {
					return async () => ({
						commit,
						rollback,
					});
				},
			});

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await expect(
				pipeline.run({
					phase: 'generate',
					config,
					namespace: 'rollback',
					origin: 'typescript',
					sourcePath: FIXTURE_CONFIG_PATH,
					workspace,
					reporter,
				})
			).rejects.toThrow('builder failure');

			expect(commit).not.toHaveBeenCalled();
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('skips rollback when extension does not provide a rollback handler', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.rollback-missing',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'rollback-missing',
								sanitizedNamespace: 'RollbackMissing',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'RollbackMissing',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.rollback-missing',
					kind: 'fragment',
					dependsOn: ['ir.meta.rollback-missing'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.rollback-missing',
					kind: 'fragment',
					dependsOn: ['ir.resources.rollback-missing'],
					apply() {
						// validation no-op
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.rollback-missing',
					kind: 'builder',
					async apply() {
						throw new Error('builder failure');
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback-missing',
				register() {
					return async () => ({ commit });
				},
			});

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await expect(
				pipeline.run({
					phase: 'generate',
					config,
					namespace: 'rollback-missing',
					origin: 'typescript',
					sourcePath: FIXTURE_CONFIG_PATH,
					workspace,
					reporter,
				})
			).rejects.toThrow('builder failure');

			expect(commit).not.toHaveBeenCalled();
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('warns when extension rollback fails', async () => {
		await runWithWorkspace(async (workspaceRoot) => {
			const pipeline = createPipeline();
			const commit = jest.fn();
			const rollback = jest
				.fn()
				.mockRejectedValue(new Error('rollback failure'));

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.rollback-warning',
					kind: 'fragment',
					mode: 'override',
					apply({ output }) {
						output.assign({
							meta: {
								version: 1,
								namespace: 'rollback-warning',
								sanitizedNamespace: 'RollbackWarning',
								origin: 'typescript',
								sourcePath: 'config.ts',
							},
							php: {
								namespace: 'RollbackWarning',
								autoload: 'inc/',
								outputDir: '.generated/php',
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.rollback-warning',
					kind: 'fragment',
					dependsOn: ['ir.meta.rollback-warning'],
					apply({ output }) {
						output.assign({
							schemas: [],
							resources: [],
							policies: [],
							blocks: [],
							policyMap: createPolicyMap(),
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.rollback-warning',
					kind: 'fragment',
					dependsOn: ['ir.resources.rollback-warning'],
					apply() {
						// validation no-op
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.rollback-warning',
					kind: 'builder',
					async apply() {
						throw new Error('builder failure');
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback-warning',
				register() {
					return async () => ({ commit, rollback });
				},
			});

			const workspace = createWorkspace(workspaceRoot);
			const reporter = createReporterMock();

			await expect(
				pipeline.run({
					phase: 'generate',
					config,
					namespace: 'rollback-warning',
					origin: 'typescript',
					sourcePath: FIXTURE_CONFIG_PATH,
					workspace,
					reporter,
				})
			).rejects.toThrow('builder failure');

			expect(commit).not.toHaveBeenCalled();
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(reporter.warn).toHaveBeenCalledWith(
				'Pipeline extension rollback failed.',
				{
					error: 'rollback failure',
					extensions: ['extension.rollback-warning'],
				}
			);
		});
	});
});
