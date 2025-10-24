import {
	buildArray,
	buildArrayItem,
	buildArrowFunction,
	buildBooleanNot,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNode,
	buildIfStatement,
	buildIdentifier,
	buildParam,
	type PhpStmtElse,
	type PhpStmtForeach,
} from '@wpkernel/php-json-ast';
import {
	buildVariableAssignment,
	normaliseVariableReference,
	printStatement,
	buildBinaryOperation,
} from '../utils';
import { formatInlinePhpExpression } from '../printer';

describe('resource printer helpers', () => {
	it('formats assignment statements', () => {
		const assignment = buildVariableAssignment(
			normaliseVariableReference('result'),
			buildScalarInt(42)
		);

		const printable = printStatement(assignment, 0);
		expect(printable.lines).toEqual(['$result = 42;']);
	});

	it('formats assignments to empty arrays without extra indentation', () => {
		const assignment = buildVariableAssignment(
			normaliseVariableReference('items'),
			buildArray([])
		);

		const printable = printStatement(assignment, 0);
		expect(printable.lines).toEqual(['$items = [];']);
	});

	it('formats if statements with else branches', () => {
		const condition = buildVariable('flag');
		const thenBranch = buildVariableAssignment(
			normaliseVariableReference('value'),
			buildScalarInt(1)
		);
		const elseBranchStmt = buildVariableAssignment(
			normaliseVariableReference('value'),
			buildScalarInt(0)
		);

		const elseNode = buildNode<PhpStmtElse>('Stmt_Else', {
			stmts: [elseBranchStmt],
		});

		const ifNode = buildIfStatement(condition, [thenBranch], {
			elseBranch: elseNode,
		});

		const printable = printStatement(ifNode, 0);
		expect(printable.lines).toEqual([
			'if ($flag) {',
			'        $value = 1;',
			'} else {',
			'        $value = 0;',
			'}',
		]);
	});

	it('formats foreach loops with keyed references and blank lines', () => {
		const guard = buildIfStatement(buildVariable('shouldSkip'), [
			buildVariableAssignment(
				normaliseVariableReference('value'),
				buildScalarInt(1)
			),
		]);
		const appendResult = buildVariableAssignment(
			normaliseVariableReference('result'),
			buildVariable('item')
		);

		const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
			expr: buildVariable('items'),
			keyVar: buildVariable('key'),
			valueVar: buildVariable('item'),
			byRef: true,
			stmts: [guard, appendResult],
		});

		const printable = printStatement(foreachNode, 0);
		expect(printable.lines).toEqual([
			'foreach ( $items as $key => &$item ) {',
			'        if ($shouldSkip) {',
			'                $value = 1;',
			'        }',
			'',
			'        $result = $item;',
			'}',
		]);
	});

	it('formats return statements with nested arrays', () => {
		const arrayNode = buildArray([
			buildArrayItem(buildScalarInt(1)),
			buildArrayItem(buildScalarInt(2), {
				key: buildScalarString('two'),
			}),
		]);

		const printable = printStatement(buildReturn(arrayNode), 1);
		expect(printable.lines).toEqual([
			'        return [',
			'                1,',
			"                'two' => 2,",
			'        ];',
		]);
	});

	it('formats return statements without expressions', () => {
		const printable = printStatement(buildReturn(null), 0);
		expect(printable.lines).toEqual(['return;']);
	});

	it('formats inline arrow functions with typed parameters', () => {
		const arrowFunction = buildArrowFunction({
			static: true,
			byRef: true,
			params: [
				buildParam(buildVariable('value'), {
					type: buildIdentifier('int'),
					byRef: true,
					variadic: true,
					default: buildScalarInt(10),
				}),
			],
			expr: buildBooleanNot(
				buildBinaryOperation(
					'Greater',
					buildVariable('value'),
					buildScalarInt(0)
				)
			),
		});

		expect(formatInlinePhpExpression(arrowFunction)).toEqual(
			'static fn &(int &...$value = 10) => !($value > 0)'
		);
	});

	it('preserves binary operator precedence for grouped expressions', () => {
		const offsetAssignment = buildVariableAssignment(
			normaliseVariableReference('offset'),
			buildBinaryOperation(
				'Mul',
				buildBinaryOperation(
					'Minus',
					buildVariable('page'),
					buildScalarInt(1)
				),
				buildVariable('per_page')
			)
		);

		const printable = printStatement(offsetAssignment, 0);
		expect(printable.lines).toEqual(['$offset = ($page - 1) * $per_page;']);
	});
});
