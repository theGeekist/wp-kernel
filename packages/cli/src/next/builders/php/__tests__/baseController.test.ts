import { createPhpBaseControllerHelper } from '../baseController';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { resetPhpAstChannel } from '@wpkernel/php-json-ast';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../../../../../tests/test-support/php-builder.test-support';

describe('createPhpBaseControllerHelper', () => {
	it('skips generation when the IR artifact is not available', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpBaseControllerHelper();
		const next = jest.fn();
		const output = createBuilderOutput();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output,
				reporter: context.reporter,
			},
			next
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('generates a base controller file when an IR artifact is provided', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpBaseControllerHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'DemoPlugin',
				origin: 'wpk.config.ts',
			},
			php: {
				namespace: 'Demo\\Plugin',
				outputDir: '.generated/php',
				autoload: 'inc/',
			},
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

		const pending = getPhpBuilderChannel(context).pending();
		const entry = pending.find(
			(candidate) => candidate.metadata.kind === 'base-controller'
		);

		expect(entry).toBeDefined();
		expect(entry?.docblock).toEqual(
			expect.arrayContaining([
				expect.stringContaining('namespace: DemoPlugin'),
			])
		);
	});
});
