import {
	buildArg,
	buildAssign,
	buildArrowFunction,
	buildExpressionStatement,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNode,
	buildParam,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	PHP_INDENT,
	type PhpExpr,
	type PhpExprTernary,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildForeachStatement,
} from '../utils';
import { formatInlinePhpExpression, formatStatement } from '../printer';

describe('resource printer', () => {
	it('formats ternary expressions with and without explicit true branches', () => {
		const condition = buildVariable('condition');
		const ternary = buildNode<PhpExprTernary>('Expr_Ternary', {
			cond: condition,
			if: buildScalarString('yes'),
			else: buildScalarString('no'),
		});
		const elvis = buildNode<PhpExprTernary>('Expr_Ternary', {
			cond: condition,
			if: null,
			else: buildScalarString('fallback'),
		});

		expect(formatInlinePhpExpression(ternary)).toBe(
			"$condition ? 'yes' : 'no'"
		);
		expect(formatInlinePhpExpression(elvis)).toBe(
			"$condition ?: 'fallback'"
		);
	});

	it('wraps boolean not expressions that require parentheses', () => {
		const simple = buildBooleanNot(buildVariable('enabled'));
		const complex = buildBooleanNot(
			buildBinaryOperation(
				'Greater',
				buildVariable('count'),
				buildScalarInt(10)
			)
		);

		expect(formatInlinePhpExpression(simple)).toBe('!$enabled');
		expect(formatInlinePhpExpression(complex)).toBe('!($count > 10)');
	});

	it('inserts blank lines between nested if statements and following expressions', () => {
		const nestedIf = buildIfStatement(buildVariable('innerCondition'), [
			buildExpressionStatement(
				buildMethodCall(buildVariable('service'), buildName(['handle']))
			),
		]);

		const assignment = buildExpressionStatement(
			buildAssign(buildVariable('result'), buildVariable('value'))
		);

		const parent = buildIfStatement(buildVariable('outerCondition'), [
			nestedIf,
			assignment,
		]);

		const lines = formatStatement(parent, 1, PHP_INDENT);

		expect(lines).toContain('');
		const blankLineIndex = lines.indexOf('');
		expect(lines[blankLineIndex - 1]).toBe(`${PHP_INDENT.repeat(2)}}`);
		expect(lines[blankLineIndex + 1]).toBe(
			`${PHP_INDENT.repeat(2)}$result = $value;`
		);
	});

	it('formats nop statements with inline comments', () => {
		const comment = buildNode<PhpStmt>(
			'Stmt_Nop',
			{},
			{
				comments: [{ text: '// comment' }],
			}
		);

		expect(formatStatement(comment, 1, PHP_INDENT)).toEqual([
			`${PHP_INDENT}// comment`,
		]);
	});

	it('formats nop statements without comments as semicolons', () => {
		const nop = buildNode<PhpStmt>('Stmt_Nop', {});

		expect(formatStatement(nop, 1, PHP_INDENT)).toEqual([`${PHP_INDENT};`]);
	});

	it('formats foreach statements with keys and by-reference values', () => {
		const statement = buildForeachStatement({
			iterable: buildVariable('items'),
			key: 'index',
			value: 'item',
			byRef: true,
			statements: [
				buildExpressionStatement(
					buildMethodCall(
						buildVariable('logger'),
						buildName(['log']),
						[buildArg(buildVariable('item'))]
					)
				),
			],
		});

		const lines = formatStatement(statement, 1, PHP_INDENT);
		expect(lines[0]).toBe(
			`${PHP_INDENT}foreach ( $items as $index => &$item ) {`
		);
		expect(lines).toContain(`${PHP_INDENT.repeat(2)}$logger->log($item);`);
	});

	it('formats keyed array literals across multiple lines', () => {
		const arrayExpr = buildArrayLiteral([
			{ value: buildScalarString('first') },
			{
				key: 'second',
				value: buildScalarString('value'),
			},
		]);

		const lines = formatStatement(
			buildExpressionStatement(arrayExpr),
			1,
			PHP_INDENT
		);

		expect(lines).toEqual([
			`${PHP_INDENT}[`,
			`${PHP_INDENT.repeat(2)}'first',`,
			`${PHP_INDENT.repeat(2)}'second' => 'value',`,
			`${PHP_INDENT}];`,
		]);
	});

	it('formats parameter lists with types, references, and defaults', () => {
		const arrowFunction = buildArrowFunction({
			static: true,
			byRef: true,
			params: [
				buildParam(buildVariable('value'), {
					type: buildName(['string']),
					byRef: true,
				}),
				buildParam(buildVariable('context'), {
					type: buildNode('NullableType', {
						type: buildName(['array']),
					}),
					default: buildArrayLiteral([]),
				}),
			],
			expr: buildVariable('value'),
		});

		expect(formatInlinePhpExpression(arrowFunction)).toBe(
			'static fn &(string &$value, ?array $context = []) => $value'
		);
	});

	it('formats return statements with and without expressions', () => {
		const returnVoid = buildReturn(null);
		const returnExpr = buildReturn(
			buildNode<PhpExpr>('Expr_Ternary', {
				cond: buildVariable('value'),
				if: buildScalarString('one'),
				else: buildScalarString('two'),
			})
		);

		expect(formatStatement(returnVoid, 1, PHP_INDENT)).toEqual([
			`${PHP_INDENT}return;`,
		]);

		expect(formatStatement(returnExpr, 1, PHP_INDENT)).toEqual([
			`${PHP_INDENT}return $value ? 'one' : 'two';`,
		]);
	});

	it('formats variable variables', () => {
		const variable = buildVariable(buildVariable('dynamic'));

		expect(formatInlinePhpExpression(variable)).toBe('$$dynamic');
	});

	it('throws for unsupported inline binary operators', () => {
		const operation = buildNode<PhpExpr>('Expr_BinaryOp_Pow', {
			left: buildVariable('left'),
			right: buildVariable('right'),
		});

		expect(() => formatInlinePhpExpression(operation)).toThrow(
			/Unsupported inline expression node/
		);
	});

	it('formats arrow functions with empty parameter lists', () => {
		const arrow = buildArrowFunction({ expr: buildVariable('value') });

		expect(formatInlinePhpExpression(arrow)).toBe('fn () => $value');
	});

	it('throws for unsupported statement nodes', () => {
		const breakStatement = buildNode<PhpStmt>('Stmt_Break', {
			num: null,
		});

		expect(() => formatStatement(breakStatement, 0, PHP_INDENT)).toThrow(
			/Unsupported statement node/
		);
	});

	it('throws for unsupported inline expression nodes', () => {
		const closure = buildNode<PhpExpr>('Expr_Closure', {
			static: false,
			byRef: false,
			params: [],
			uses: [],
			returnType: null,
			stmts: [],
			attrGroups: [],
		});

		expect(() =>
			formatStatement(buildExpressionStatement(closure), 1, PHP_INDENT)
		).toThrow(/Unsupported expression node/);
	});
});
