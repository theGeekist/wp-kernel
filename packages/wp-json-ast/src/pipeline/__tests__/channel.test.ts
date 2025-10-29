import { createPhpChannelHelper, getPhpBuilderChannel } from '../channel';
import { getPhpAstChannel } from '@wpkernel/php-json-ast';

describe('createPhpChannelHelper', () => {
	it('resets both channels and logs debug output', async () => {
		const helper = createPhpChannelHelper();
		const reporter = buildReporter();
		const context = buildContext(reporter);

		const builderChannel = getPhpBuilderChannel(context);
		builderChannel.queue({
			file: '/workspace/generated/file.php',
			program: [],
			metadata: { kind: 'resource-controller' },
			docblock: [],
			uses: [],
			statements: [],
		});

		const astChannel = getPhpAstChannel(context);
		astChannel.open({
			key: 'test',
			filePath: '/workspace/generated/file.php',
			namespace: 'Demo',
			metadata: { kind: 'resource-controller' },
		});

		await helper.apply(
			{
				context,
				input: { phase: 'generate', options: {}, ir: null },
				output: { actions: [], queueWrite: jest.fn() },
				reporter,
			},
			undefined
		);

		expect(builderChannel.pending()).toHaveLength(0);
		expect(astChannel.entries()).toHaveLength(0);
		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpChannelHelper: channels reset for PHP pipeline.'
		);
	});
});

function buildReporter() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildContext(reporter: ReturnType<typeof buildReporter>) {
	return {
		workspace: {
			root: '/workspace',
			cwd: () => '/workspace',
			resolve: (...parts: string[]) => parts.join('/'),
			write: async () => undefined,
			exists: async () => true,
		},
		reporter,
		phase: 'generate' as const,
	};
}
