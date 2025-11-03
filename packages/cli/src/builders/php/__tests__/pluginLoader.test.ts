import { createPhpPluginLoaderHelper } from '../pluginLoader';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { AUTO_GUARD_BEGIN, resetPhpAstChannel } from '@wpkernel/wp-json-ast';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../../../../tests/test-support/php-builder.test-support';
import type { IRResource } from '../../../ir/publicTypes';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';

describe('createPhpPluginLoaderHelper', () => {
	it('skips when no IR is available', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			next
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('queues a plugin loader program with generated controllers', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'demo-plugin',
				origin: 'wpk.config.ts',
			},
			php: {
				namespace: 'Demo\\Plugin',
				autoload: 'inc/',
				outputDir: '.generated/php',
			},
			resources: [makeResource('books'), makeResource('authors')],
		});

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
		expect(entry?.file).toBe(context.workspace.resolve('plugin.php'));
		expect(entry?.docblock).toEqual([]);
		expect(entry?.metadata).toEqual({ kind: 'plugin-loader' });
		expect(entry?.program).toMatchSnapshot('plugin-loader-program');
	});

	it('respects custom namespace structures', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'acme-demo',
				origin: 'acme.config.ts',
			},
			php: {
				namespace: 'Acme\\Demo\\Plugin',
				autoload: 'src/php/',
				outputDir: '.generated/php',
			},
			resources: [makeResource('jobs')],
		});

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
		expect(entry?.file).toBe(context.workspace.resolve('plugin.php'));
		expect(entry?.program).toMatchSnapshot(
			'plugin-loader-program-custom-namespace'
		);
	});

	it('skips generation when plugin.php exists without the auto-guard', async () => {
		const readText = jest
			.fn()
			.mockResolvedValue('<?php\n// user plugin loader');
		const workspace = makeWorkspaceMock({ readText });
		const context = createPipelineContext({ workspace });
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr();
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			next
		);

		expect(readText).toHaveBeenCalledWith('plugin.php');
		expect(context.reporter.info).toHaveBeenCalledWith(
			'createPhpPluginLoaderHelper: skipping generation because plugin.php exists and appears user-owned.'
		);
		expect(next).toHaveBeenCalledTimes(1);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('queues a new loader when the existing plugin.php contains the auto-guard', async () => {
		const readText = jest
			.fn()
			.mockResolvedValue(`<?php\n// ${AUTO_GUARD_BEGIN}\n`);
		const workspace = makeWorkspaceMock({ readText });
		const context = createPipelineContext({ workspace });
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		expect(readText).toHaveBeenCalledWith('plugin.php');
		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
	});
});

function makeResource(name: string): IRResource {
	return {
		name,
		schemaKey: `${name}.schema`,
		schemaProvenance: 'manual',
		routes: [
			{
				method: 'GET',
				path: `/kernel/v1/${name}`,
				transport: 'local',
				hash: `${name}-get`,
			},
		],
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
		},
		hash: `${name}-hash`,
		warnings: [],
	} as IRResource;
}
