import {
	createClassMethod,
	createDocComment,
	createIdentifier,
	createReturn,
	createStmtNop,
} from '../nodes';
import { createPrintable } from '../printables';
import {
	PHP_INDENT,
	PhpMethodBodyBuilder,
	createClassTemplate,
	createMethodTemplate,
} from '../templates';
import { PHP_CLASS_MODIFIER_FINAL } from '../modifiers';

describe('PhpMethodBodyBuilder', () => {
	it('appends lines and statements with optional indentation', () => {
		const builder = new PhpMethodBodyBuilder(PHP_INDENT, 1);
		builder.line('echo 1;');
		builder.line();

		const printable = createPrintable(createStmtNop(), ['noop']);
		builder.statement(printable);

		const returnPrintable = createPrintable(createReturn(null), [
			'return;',
		]);
		builder.statement(returnPrintable, { applyIndent: true });

		expect(builder.toLines()).toEqual([
			'        echo 1;',
			'',
			'noop',
			'        return;',
		]);
		expect(builder.toStatements()).toHaveLength(2);
	});
});

describe('createMethodTemplate', () => {
	it('builds method templates with docblocks and AST metadata', () => {
		const template = createMethodTemplate({
			signature: 'public function example(): int',
			indentLevel: 1,
			docblock: ['Example description.'],
			body: (body) => {
				body.line('$value = 1;');
				const printable = createPrintable(
					createReturn(createIdentifier('value') as any),
					['return $value;']
				);
				body.statement(printable, { applyIndent: true });
			},
			ast: {
				name: 'example',
				returnType: createIdentifier('int'),
			},
		});

		expect([...template]).toEqual([
			'        /**',
			'         * Example description.',
			'         */',
			'        public function example(): int',
			'        {',
			'                $value = 1;',
			'                return $value;',
			'        }',
		]);
		expect(template.node?.name.name).toBe('example');
		expect(template.node?.stmts).toHaveLength(1);
	});

	it('merges docblock comments with existing attributes and custom indentation', () => {
		const template = createMethodTemplate({
			signature: 'public function annotated()',
			indentLevel: 0,
			indentUnit: '\t',
			docblock: ['Additional context.'],
			body: () => undefined,
			ast: {
				attributes: {
					comments: [createDocComment(['Existing comment.'])],
				},
			},
		});

		expect([...template]).toEqual([
			'/**',
			' * Additional context.',
			' */',
			'public function annotated()',
			'{',
			'}',
		]);
		expect(template.node?.attributes?.comments).toHaveLength(2);
	});

	it('omits docblocks and body lines when none are provided', () => {
		const template = createMethodTemplate({
			signature: 'public function empty()',
			indentLevel: 0,
			body: () => undefined,
		});

		expect([...template]).toEqual(['public function empty()', '{', '}']);
	});
});

describe('createClassTemplate', () => {
	it('builds class templates with docblocks, inheritance, and methods', () => {
		const method = createMethodTemplate({
			signature: 'public function demo()',
			indentLevel: 1,
			body: () => undefined,
			ast: { name: 'demo' },
		});

		const helperNode = createClassMethod(createIdentifier('helper'));
		const template = createClassTemplate({
			name: 'Sample',
			flags: PHP_CLASS_MODIFIER_FINAL,
			docblock: ['Class summary.'],
			extends: '\\Vendor\\BaseClass',
			implements: ['JsonSerializable', ['IteratorAggregate']],
			attributes: {
				comments: [createDocComment(['Existing class comment.'])],
			},
			members: [
				createPrintable(helperNode, [
					'        public function helper() {}',
				]),
			],
			methods: [method],
		});

		expect(template.lines).toEqual([
			'/**',
			' * Class summary.',
			' */',
			'final class Sample extends \\Vendor\\BaseClass implements JsonSerializable, IteratorAggregate',
			'{',
			'        public function helper() {}',
			'',
			'        public function demo()',
			'        {',
			'        }',
			'}',
		]);
		expect(template.node.extends?.nodeType).toBe('Name_FullyQualified');
		expect(template.node.implements).toHaveLength(2);
		expect(template.node.attributes?.comments).toHaveLength(2);
	});

	it('skips optional clauses when they are not provided', () => {
		const template = createClassTemplate({
			name: 'EmptyClass',
			methods: [],
			members: [],
		});

		expect(template.lines).toEqual(['class EmptyClass', '{', '}']);
		expect(template.node.extends).toBeNull();
		expect(template.node.implements).toEqual([]);
	});
});
