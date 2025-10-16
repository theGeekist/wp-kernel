import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { IRPolicyMap } from '../../../ir/types';
import { KernelError } from '@wpkernel/core/error';
import { createHelper } from '../../helper';
import { createPipeline } from '../createPipeline';
import type { KernelConfigV1 } from '../../../config/types';
import { FIXTURE_CONFIG_PATH } from '../../../ir/test-helpers';
import { createWorkspace } from '../../workspace';

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

	async function withWorkspace<T>(
		run: (workspaceRoot: string) => Promise<T>
	): Promise<T> {
		const root = await fs.mkdtemp(
			path.join(os.tmpdir(), 'pipeline-workspace-')
		);
		try {
			return await run(root);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	}

	it('orders helpers by dependency metadata and executes builders', async () => {
		await withWorkspace(async (workspaceRoot) => {
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
			const { steps, ir } = await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'test-namespace',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter: createNoopReporter(),
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
		await withWorkspace(async (workspaceRoot) => {
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

			await expect(
				pipeline.run({
					phase: 'generate',
					config,
					namespace: 'cycle',
					origin: 'typescript',
					sourcePath: FIXTURE_CONFIG_PATH,
					workspace,
					reporter: createNoopReporter(),
				})
			).rejects.toThrow(KernelError);
		});
	});

	it('supports top-level helper registration and extensions', async () => {
		await withWorkspace(async (workspaceRoot) => {
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
			const { steps } = await pipeline.run({
				phase: 'generate',
				config,
				namespace: 'ext',
				origin: 'typescript',
				sourcePath: FIXTURE_CONFIG_PATH,
				workspace,
				reporter: createNoopReporter(),
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
});
