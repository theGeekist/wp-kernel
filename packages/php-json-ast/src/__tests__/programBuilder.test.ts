import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';

// Simplified types - just what the tests need
type BuilderInput = any;
type BuilderOutput = any;
import { appendClassTemplate, appendMethodTemplates } from '../append';
import { appendGeneratedFileDocblock } from '../docblocks';
import {
	createClassTemplate,
	createMethodTemplate,
	PHP_INDENT,
} from '../templates';
import { createPhpFileBuilder } from '../programBuilder';
import { createIdentifier, createStmtNop } from '../nodes';
import {
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '../modifiers';
import {
	resetTestChannels,
	getTestBuilderQueue,
} from './testUtils.test-support';
import type { PhpFileMetadata } from '../types';

function createReporter(): Reporter {
	const reporter = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn(),
	};
	(reporter.child as jest.Mock).mockReturnValue(reporter);
	return reporter as Reporter;
}

function createPipelineContext() {
	return {
		workspace: {
			root: '/workspace',
			resolve: (...parts: string[]) => path.join('/workspace', ...parts),
			cwd: () => '/workspace',
			read: async () => null,
			readText: async () => null,
			write: async () => undefined,
			writeJson: async () => undefined,
			exists: async () => false,
			rm: async () => undefined,
			glob: async () => [],
			threeWayMerge: async () => 'clean',
			begin: () => undefined,
			commit: async () => ({ writes: [], deletes: [] }),
			rollback: async () => ({ writes: [], deletes: [] }),
			dryRun: async (fn: () => Promise<any>) => ({
				result: await fn(),
				manifest: { writes: [], deletes: [] },
			}),
			tmpDir: async (_prefix?: string) => '.tmp',
		},
		reporter: createReporter(),
		phase: 'generate' as const,
	};
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
		ir: {
			meta: {
				version: 1,
				namespace: 'demo-plugin',
				sanitizedNamespace: 'DemoPlugin',
				origin: 'kernel.config.ts',
				sourcePath: 'kernel.config.ts',
			},
			config: {} as never,
			schemas: [],
			resources: [],
			policies: [],
			policyMap: {
				sourcePath: undefined,
				definitions: [],
				fallback: {
					capability: 'manage_options',
					appliesTo: 'resource',
				},
				missing: [],
				unused: [],
				warnings: [],
			},
			blocks: [],
			php: {
				namespace: 'Demo\\Plugin',
				autoload: 'inc/',
				outputDir: '.generated/php',
			},
		} as unknown as BuilderInput['ir'],
	};
}

describe('programBuilder helpers', () => {
	it('collects namespace metadata and emits a PhpProgram', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetTestChannels(context);

		const helper = createPhpFileBuilder({
			key: 'test-program',
			filePath: '/workspace/.generated/php/Example.php',
			namespace: 'Demo\\Example',
			metadata: { kind: 'policy-helper' },
			build: (builder) => {
				appendGeneratedFileDocblock(builder, ['Example file']);
				builder.addUse('Demo\\Contracts');
				builder.addUse('function Demo\\Helpers\\Foo');
				builder.addUse('Demo\\Contracts');
				builder.appendStatement('// class declaration');

				const method = createMethodTemplate({
					signature: 'public function label(): string',
					indentLevel: 1,
					indentUnit: PHP_INDENT,
					body: (body) => {
						body.line("return 'demo';");
					},
					ast: {
						flags: PHP_METHOD_MODIFIER_PUBLIC,
						returnType: createIdentifier('string'),
					},
				});

				const classTemplate = createClassTemplate({
					name: 'Example',
					flags: PHP_CLASS_MODIFIER_ABSTRACT,
					methods: [method],
				});

				appendClassTemplate(builder, classTemplate);
				builder.appendProgramStatement(createStmtNop());
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

		const actions = getTestBuilderQueue(context);
		expect(actions).toHaveLength(1);
		const [action] = actions;
		expect(action!.file).toBe('/workspace/.generated/php/Example.php');
		expect(action!.metadata.kind).toBe('policy-helper');
		expect(action!.docblock).toContain('Example file');
		expect(action!.uses).toEqual([
			'Demo\\Contracts',
			'function Demo\\Helpers\\Foo',
		]);
		expect(action!.statements).toContain('// class declaration');

		const [declareNode, namespaceNode] = action!.program;
		expect(declareNode!.nodeType).toBe('Stmt_Declare');
		expect(namespaceNode!.nodeType).toBe('Stmt_Namespace');
		expect((namespaceNode as any)?.stmts?.[0]?.nodeType).toBe('Stmt_Use');
		const classNode = (namespaceNode as any)?.stmts?.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Class'
		);
		expect(classNode?.nodeType).toBe('Stmt_Class');
		expect(classNode?.stmts?.[0]?.nodeType).toBe('Stmt_ClassMethod');
		expect((namespaceNode as any)?.stmts?.at(-1)?.nodeType).toBe(
			'Stmt_Nop'
		);
	});

	it('appendMethodTemplates inserts blank lines between methods', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const helper = createPhpFileBuilder({
			key: 'blank-methods',
			filePath: '/workspace/.generated/php/Blank.php',
			namespace: 'Demo\\Blank',
			metadata: { kind: 'policy-helper' },
			build: (builder) => {
				const first = createMethodTemplate({
					signature: 'public function first()',
					indentLevel: 1,
					body: (body) => {
						body.line('return 1;');
					},
					ast: {
						flags: PHP_METHOD_MODIFIER_PUBLIC,
						returnType: null,
					},
				});

				const second = createMethodTemplate({
					signature: 'public function second()',
					indentLevel: 1,
					body: (body) => {
						body.line('return 2;');
					},
					ast: {
						flags: PHP_METHOD_MODIFIER_PUBLIC,
						returnType: null,
					},
				});

				appendMethodTemplates(builder, [first, second]);
			},
		});

		resetTestChannels(context);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const pending = getTestBuilderQueue(context);
		expect(pending).toHaveLength(1);
		const statements = pending[0]!.statements;
		const blankLines = statements.filter((line) => line === '');
		expect(blankLines).toHaveLength(1);
	});

	it('normalises use statements, namespace overrides, and metadata updates', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const helper = createPhpFileBuilder({
			key: 'normalised-uses',
			filePath: '/workspace/.generated/php/Normalised.php',
			namespace: 'Demo\\Original',
			metadata: { kind: 'policy-helper' },
			build: (builder) => {
				builder.addUse('   ');
				builder.addUse('\\');
				builder.addUse('Demo\\Contracts as ContractAlias');
				builder.addUse('function Demo\\Helpers\\foo');
				builder.addUse('const Demo\\Constants\\BAR');
				builder.addUse('\\Vendor\\Package\\Thing');
				builder.addUse('Demo\\Special\\Name as CustomAlias');
				builder.addUse('function Demo\\Helpers\\bar');
				builder.addUse('Demo\\Special\\Helper');
				builder.addUse('const Demo\\Constants\\BAZ');

				builder.appendDocblock('Example docblock');
				builder.appendStatement('return 1;');
				builder.appendProgramStatement(createStmtNop());

				const overrideMetadata: PhpFileMetadata = {
					kind: 'base-controller',
				};
				builder.setMetadata(overrideMetadata);
				builder.setNamespace('Demo\\Override');

				expect(builder.getNamespace()).toBe('Demo\\Override');
				expect(builder.getStatements()).toContain('return 1;');
				expect(builder.getMetadata()).toBe(overrideMetadata);
				expect(builder.getProgramAst()[1]?.nodeType).toBe(
					'Stmt_Namespace'
				);
			},
		});

		resetTestChannels(context);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const actions = getTestBuilderQueue(context);
		expect(actions).toHaveLength(1);
		const [action] = actions;
		expect(action!.docblock).toContain('Example docblock');
		expect(action!.statements).toContain('return 1;');
		expect(action!.metadata.kind).toBe('base-controller');
		expect(action!.uses).toEqual([
			'Demo\\Contracts as ContractAlias',
			'Demo\\Special\\{Helper, Name as CustomAlias}',
			'\\Vendor\\Package\\Thing',
			'function Demo\\Helpers\\{bar, foo}',
			'const Demo\\Constants\\{BAR, BAZ}',
		]);
		const namespaceNode = action!.program.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Namespace'
		);
		const namespaceUses =
			namespaceNode?.nodeType === 'Stmt_Namespace'
				? (namespaceNode as any).stmts.filter(
						(stmt: any) => stmt.nodeType === 'Stmt_GroupUse'
					)
				: [];
		expect(namespaceUses).toHaveLength(3);
	});
});
