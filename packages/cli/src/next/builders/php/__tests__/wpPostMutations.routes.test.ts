import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import {
	createPhpProgramBuilder,
	appendClassTemplate,
	resetPhpAstChannel,
} from '@wpkernel/php-json-ast';
import {
	assembleClassTemplate,
	assembleMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast';
import {
	WP_POST_MUTATION_CONTRACT,
	buildCreateRouteBody,
	buildUpdateRouteBody,
	buildDeleteRouteBody,
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
} from '../resource/wpPost/mutations';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import type { IRResource } from '../../../../ir/types';

const CONTRACT = WP_POST_MUTATION_CONTRACT;

type ChannelEntry = ReturnType<
	ReturnType<typeof getPhpBuilderChannel>['pending']
>[number];

function createReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	} as Reporter;
}

function createPipelineContext(): PipelineContext {
	return {
		workspace: {
			root: '/workspace',
			resolve: (...parts: string[]) => path.join('/workspace', ...parts),
			cwd: () => '/workspace',
			read: async () => null,
			readText: async () => null,
			write: jest.fn(async () => undefined),
			writeJson: jest.fn(async () => undefined),
			exists: async () => false,
			rm: async () => undefined,
			glob: async () => [],
			threeWayMerge: async () => 'clean',
			begin: () => undefined,
			commit: async () => ({ writes: [], deletes: [] }),
			rollback: async () => ({ writes: [], deletes: [] }),
			dryRun: async (fn) => ({
				result: await fn(),
				manifest: { writes: [], deletes: [] },
			}),
			tmpDir: async () => '.tmp',
		},
		reporter: createReporter(),
		phase: 'generate',
	} as unknown as PipelineContext;
}

function createBuilderInput(): BuilderInput {
	return {
		phase: 'generate',
		options: {
			config: {} as never,
			namespace: 'demo-plugin',
			origin: 'kernel.config.ts',
			sourcePath: 'kernel.config.ts',
		},
		ir: null,
	};
}

const RESOURCE: IRResource = {
	name: 'book',
	schemaKey: 'book',
	schemaProvenance: 'manual',
	routes: [],
	cacheKeys: {
		list: { segments: ['book', 'list'], source: 'default' },
		get: { segments: ['book', 'get'], source: 'default' },
		create: { segments: ['book', 'create'], source: 'default' },
		update: { segments: ['book', 'update'], source: 'default' },
		remove: { segments: ['book', 'remove'], source: 'default' },
	},
	identity: { type: 'number', param: 'id' },
	storage: {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title', 'editor'],
		meta: {
			subtitle: { type: 'string' },
		},
		taxonomies: {
			category: { taxonomy: 'category' },
		},
	},
	queryParams: {},
	ui: undefined,
	hash: 'book-hash',
	warnings: [],
};

const PASCALE_NAME = 'Book';
const IDENTITY = { type: 'number', param: 'id' } as const;

async function queueRouteProgram(
	buildMethod: (body: PhpMethodBodyBuilder) => void,
	metadata: Record<string, string>
): Promise<{ entry: ChannelEntry; context: PipelineContext }> {
	const context = createPipelineContext();
	const input = createBuilderInput();
	const output: BuilderOutput = { actions: [], queueWrite: jest.fn() };

	resetPhpBuilderChannel(context);
	resetPhpAstChannel(context);

	const helper = createPhpProgramBuilder<
		PipelineContext,
		BuilderInput,
		BuilderOutput
	>({
		key: `mutation.route.${metadata.kind}`,
		filePath: context.workspace.resolve(
			'.generated',
			'php',
			`mutation-${metadata.kind}.php`
		),
		namespace: 'Demo\\Rest',
		metadata: {
			kind: 'resource-mutation',
			name: metadata.kind,
			tags: metadata,
		},
		async build(builder) {
			const method = assembleMethodTemplate({
				signature: 'public function handle( WP_REST_Request $request )',
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: buildMethod,
			});
			const classTemplate = assembleClassTemplate({
				name: 'MutationHarness',
				methods: [method],
			});
			appendClassTemplate(builder, classTemplate);
		},
	});

	await helper.apply(
		{ context, input, output, reporter: context.reporter },
		undefined
	);

	const channel = getPhpBuilderChannel(context);
	const entry = channel.pending()[0];
	return { entry, context };
}

async function queueHelperPrograms(): Promise<{
	entries: ChannelEntry[];
	context: PipelineContext;
}> {
	const context = createPipelineContext();
	const input = createBuilderInput();
	const output: BuilderOutput = { actions: [], queueWrite: jest.fn() };

	resetPhpBuilderChannel(context);
	resetPhpAstChannel(context);

	const helpers = [
		{ key: 'sync-meta', factory: syncWpPostMeta },
		{ key: 'sync-taxonomies', factory: syncWpPostTaxonomies },
		{ key: 'prepare-response', factory: prepareWpPostResponse },
	];

	for (const helperFactory of helpers) {
		const builderHelper = createPhpProgramBuilder<
			PipelineContext,
			BuilderInput,
			BuilderOutput
		>({
			key: `mutation.helper.${helperFactory.key}`,
			filePath: context.workspace.resolve(
				'.generated',
				'php',
				`${helperFactory.key}.php`
			),
			namespace: 'Demo\\Rest',
			metadata: {
				kind: 'resource-helper',
				helper: helperFactory.key,
			},
			async build(builder) {
				const method = helperFactory.factory({
					resource: RESOURCE,
					pascalName: PASCALE_NAME,
					identity: IDENTITY,
				});
				const classTemplate = assembleClassTemplate({
					name: 'MutationHelpers',
					methods: [method],
				});
				appendClassTemplate(builder, classTemplate);
			},
		});

		await builderHelper.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);
	}

	const channel = getPhpBuilderChannel(context);
	return { entries: channel.pending(), context };
}

describe('wp-post mutation route builders', () => {
	it('emits create route body with macros in expected order', async () => {
		const { entry } = await queueRouteProgram(
			(body) => {
				const built = buildCreateRouteBody({
					body,
					indentLevel: 2,
					resource: RESOURCE,
					pascalName: PASCALE_NAME,
					metadataKeys: CONTRACT.metadataKeys,
				});

				expect(built).toBe(true);
			},
			{ kind: 'create' }
		);

		const source = entry.statements.join('\n');
		expect(
			source.indexOf(CONTRACT.metadataKeys.statusValidation)
		).toBeLessThan(source.indexOf(CONTRACT.metadataKeys.syncMeta));
		expect(source.indexOf(CONTRACT.metadataKeys.syncMeta)).toBeLessThan(
			source.indexOf(CONTRACT.metadataKeys.syncTaxonomies)
		);
		expect(
			source.indexOf(CONTRACT.metadataKeys.syncTaxonomies)
		).toBeLessThan(source.indexOf(CONTRACT.metadataKeys.cachePriming));
		expect(entry.program).toMatchSnapshot('create-route');
	});

	it('emits update route body with guarded status macro', async () => {
		const { entry } = await queueRouteProgram(
			(body) => {
				const built = buildUpdateRouteBody({
					body,
					indentLevel: 2,
					resource: RESOURCE,
					pascalName: PASCALE_NAME,
					metadataKeys: CONTRACT.metadataKeys,
					identity: IDENTITY,
				});

				expect(built).toBe(true);
			},
			{ kind: 'update' }
		);

		const statements = entry.statements.join('\n');
		expect(statements).toContain('if (null !== $status) {');
		expect(statements.indexOf(CONTRACT.metadataKeys.syncMeta)).toBeLessThan(
			statements.indexOf(CONTRACT.metadataKeys.cachePriming)
		);
		expect(entry.program).toMatchSnapshot('update-route');
	});

	it('emits delete route body with previous response payload', async () => {
		const { entry } = await queueRouteProgram(
			(body) => {
				const built = buildDeleteRouteBody({
					body,
					indentLevel: 2,
					resource: RESOURCE,
					pascalName: PASCALE_NAME,
					metadataKeys: CONTRACT.metadataKeys,
					identity: IDENTITY,
				});

				expect(built).toBe(true);
			},
			{ kind: 'delete' }
		);

		const statements = entry.statements.join('\n');
		expect(statements).toContain("'previous' => $previous");
		expect(entry.program).toMatchSnapshot('delete-route');
	});
});

describe('wp-post mutation helpers', () => {
	it('queues helpers in contract order with stable output', async () => {
		const { entries } = await queueHelperPrograms();

		const helpers = entries.map((entry) => entry.metadata.helper);
		expect(helpers).toEqual([
			'sync-meta',
			'sync-taxonomies',
			'prepare-response',
		]);

		const snapshotPayload = entries.map((entry) => ({
			helper: entry.metadata.helper,
			statements: entry.statements,
		}));

		expect(snapshotPayload).toMatchSnapshot('helper-programs');
	});
});
