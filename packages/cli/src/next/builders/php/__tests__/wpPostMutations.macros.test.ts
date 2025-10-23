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
	appendCachePrimingMacro,
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
	buildArrayDimExpression,
	buildVariableExpression,
	WP_POST_MUTATION_CONTRACT,
} from '../resource/wpPost/mutations';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';

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
	};
}

function createPipelineContext(): PipelineContext {
	interface MockWorkspace {
		root: string;
		resolve: (...parts: string[]) => string;
		cwd: () => string;
		read: () => Promise<null>;
		readText: () => Promise<null>;
		write: jest.MockedFunction<() => Promise<undefined>>;
		writeJson: jest.MockedFunction<() => Promise<undefined>>;
		exists: () => Promise<boolean>;
		rm: () => Promise<undefined>;
		glob: () => Promise<string[]>;
		threeWayMerge: () => Promise<string>;
		begin: () => undefined;
		commit: () => Promise<{ writes: string[]; deletes: string[] }>;
		rollback: () => Promise<{ writes: string[]; deletes: string[] }>;
		dryRun: <T>(fn: () => Promise<T>) => Promise<{
			result: T;
			manifest: { writes: string[]; deletes: string[] };
		}>;
		tmpDir: () => Promise<string>;
	}

	interface MockPipelineContext {
		workspace: MockWorkspace;
		reporter: Reporter;
		phase: string;
	}

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
			dryRun: async <T>(fn: () => Promise<T>) => ({
				result: await fn(),
				manifest: { writes: [], deletes: [] },
			}),
			tmpDir: async () => '.tmp',
		},
		reporter: createReporter(),
		phase: 'generate',
	} as MockPipelineContext as unknown as PipelineContext;
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

async function queueMacroProgram(
	macro: string,
	build: (body: PhpMethodBodyBuilder) => void,
	tags: Record<string, string>
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
		key: `macro.${macro}`,
		filePath: context.workspace.resolve(
			'.generated',
			'php',
			`${macro}.php`
		),
		namespace: 'Demo\\Rest',
		metadata: {
			kind: 'resource-macro',
			macro,
			tags,
		},
		async build(builder) {
			const method = assembleMethodTemplate({
				signature:
					'public function invoke( WP_REST_Request $request ): void',
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					build(body);
				},
			});
			const classTemplate = assembleClassTemplate({
				name: 'MacroHarness',
				methods: [method],
			});
			appendClassTemplate(builder, classTemplate);
		},
	});

	await helper.apply(
		{
			context,
			input,
			output,
			reporter: context.reporter,
		},
		undefined
	);

	const channel = getPhpBuilderChannel(context);
	const entry = channel.pending()[0];
	return { entry, context };
}

describe('wp-post mutation macros', () => {
	it('appends status validation without guard', async () => {
		const { entry } = await queueMacroProgram(
			'status-validation',
			(body) => {
				appendStatusValidationMacro({
					body,
					indentLevel: 2,
					metadataKeys: CONTRACT.metadataKeys,
					pascalName: 'Books',
					target: buildVariableExpression('post_status'),
				});
			},
			{
				[CONTRACT.metadataKeys.channelTag]: 'status-validation',
				[CONTRACT.metadataKeys.statusValidation]: 'normalise',
			}
		);

		expect(entry.metadata).toMatchObject({
			kind: 'resource-macro',
			macro: 'status-validation',
		});
		expect(entry.statements).toEqual(
			expect.arrayContaining([
				expect.stringContaining(
					`// @wp-kernel ${CONTRACT.metadataKeys.channelTag} status-validation`
				),
				expect.stringContaining(
					`// @wp-kernel ${CONTRACT.metadataKeys.statusValidation} normalise`
				),
				expect.stringContaining(
					"$status = $request->get_param( 'status' );"
				),
				expect.stringContaining(
					'$post_status = $this->normaliseBooksStatus( $status );'
				),
			])
		);
		expect(entry.program).toMatchSnapshot('status-validation-macro');
	});

	it('guards status validation when null checks are enabled', async () => {
		const { entry } = await queueMacroProgram(
			'status-validation-guarded',
			(body) => {
				appendStatusValidationMacro({
					body,
					indentLevel: 2,
					metadataKeys: CONTRACT.metadataKeys,
					pascalName: 'Books',
					target: buildArrayDimExpression('post_data', 'post_status'),
					guardWithNullCheck: true,
				});
			},
			{
				[CONTRACT.metadataKeys.channelTag]: 'status-validation',
				[CONTRACT.metadataKeys.statusValidation]: 'normalise',
			}
		);

		expect(entry.statements).toEqual(
			expect.arrayContaining([
				expect.stringContaining(`if ( null !== $status ) {`),
				expect.stringContaining(
					"$post_data['post_status'] = $this->normaliseBooksStatus( $status );"
				),
			])
		);
		expect(entry.program).toMatchSnapshot(
			'status-validation-guarded-macro'
		);
	});

	it('syncs meta and taxonomies with metadata comments', async () => {
		const { entry } = await queueMacroProgram(
			'sync-mutations',
			(body) => {
				const postId = buildVariableExpression('post_id');
				appendSyncMetaMacro({
					body,
					indentLevel: 2,
					metadataKeys: CONTRACT.metadataKeys,
					pascalName: 'Books',
					postId,
				});
				appendSyncTaxonomiesMacro({
					body,
					indentLevel: 2,
					metadataKeys: CONTRACT.metadataKeys,
					pascalName: 'Books',
					postId,
					resultVariable: buildVariableExpression('taxonomy_result'),
				});
			},
			{
				[CONTRACT.metadataKeys.channelTag]: 'sync',
				[CONTRACT.metadataKeys.syncMeta]: 'update',
				[CONTRACT.metadataKeys.syncTaxonomies]: 'update',
			}
		);

		expect(entry.statements).toEqual(
			expect.arrayContaining([
				expect.stringContaining(
					`// @wp-kernel ${CONTRACT.metadataKeys.syncMeta} update`
				),
				expect.stringContaining(
					'$this->syncBooksMeta( $post_id, $request );'
				),
				expect.stringContaining(
					`// @wp-kernel ${CONTRACT.metadataKeys.syncTaxonomies} update`
				),
				expect.stringContaining(
					'$taxonomy_result = $this->syncBooksTaxonomies( $post_id, $request );'
				),
				expect.stringContaining(
					'if ( is_wp_error( $taxonomy_result ) ) {'
				),
				expect.stringContaining('return $taxonomy_result;'),
			])
		);
		expect(entry.program).toMatchSnapshot('sync-mutations-macro');
	});

	it('primes cache after mutations', async () => {
		const { entry } = await queueMacroProgram(
			'cache-priming',
			(body) => {
				appendCachePrimingMacro({
					body,
					indentLevel: 2,
					metadataKeys: CONTRACT.metadataKeys,
					pascalName: 'Books',
					postId: buildVariableExpression('post_id'),
					errorCode: 'wpk_books_load_failed',
					failureMessage: 'Unable to load created Book.',
				});
			},
			{
				[CONTRACT.metadataKeys.channelTag]: 'cache-priming',
				[CONTRACT.metadataKeys.cachePriming]: 'prime',
				[CONTRACT.metadataKeys.cacheSegment]: 'prime',
			}
		);

		expect(entry.statements).toEqual(
			expect.arrayContaining([
				expect.stringContaining(
					`// @wp-kernel ${CONTRACT.metadataKeys.cacheSegment} prime`
				),
				expect.stringContaining('$post = get_post( $post_id );'),
				expect.stringContaining('if ( ! $post instanceof WP_Post ) {'),
				expect.stringContaining(
					"return new WP_Error( 'wpk_books_load_failed', 'Unable to load created Book.', [ 'status' => 500 ] );"
				),
				expect.stringContaining(
					'return $this->prepareBooksResponse( $post, $request );'
				),
			])
		);
		expect(entry.program).toMatchSnapshot('cache-priming-macro');
	});
});
