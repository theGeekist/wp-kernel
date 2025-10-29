import { buildIndexProgram } from '../indexFile';
import type { PhpStmtReturn, PhpExprArray } from '@wpkernel/php-json-ast';

function assertArrayExpr(
	expr: PhpStmtReturn['expr']
): asserts expr is PhpExprArray {
	if (!expr || expr.nodeType !== 'Expr_Array') {
		throw new Error('Expected module index to return an array expression.');
	}
}

describe('buildIndexProgram', () => {
	it('returns a return statement that maps classes to module files', () => {
		const result = buildIndexProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\Plugin\Generated',
			entries: [
				{
					className: 'Demo\Plugin\Rest\BaseController',
					path: 'Rest/BaseController.php',
				},
				{
					className: 'Demo\Plugin\Capability\Capability',
					path: '/Capability/Capability.php',
				},
			],
			metadataName: 'module-index',
		});

		expect(result.namespace).toBe('Demo\Plugin\Generated');
		expect(result.docblock).toEqual(['Source: wpk.config.ts → php/index']);
		expect(result.metadata).toEqual({
			kind: 'index-file',
			name: 'module-index',
		});
		expect(result.statements).toHaveLength(1);

		const returnStmt = result.statements[0];
		expect(returnStmt).toBeDefined();
		if (!returnStmt || returnStmt.nodeType !== 'Stmt_Return') {
			throw new Error('Expected index program to return an array.');
		}

		const baseReturn: PhpStmtReturn = returnStmt as PhpStmtReturn;
		assertArrayExpr(baseReturn.expr);
		const arrayItems = (baseReturn.expr.items ?? []) as Array<{
			key: { value: string };
			value: {
				nodeType: string;
				left: unknown;
				right: { value: string };
			};
		}>;

		expect(arrayItems.map((item) => item.key.value)).toEqual([
			'Demo\Plugin\Rest\BaseController',
			'Demo\Plugin\Capability\Capability',
		]);

		if (arrayItems.length < 2) {
			throw new Error(
				'Expected base and capability entries in index program.'
			);
		}

		const baseEntry = arrayItems[0]!;
		const capabilityEntry = arrayItems[1]!;
		expect(baseEntry.value.right.value).toBe('/Rest/BaseController.php');
		expect(capabilityEntry.value.right.value).toBe(
			'/Capability/Capability.php'
		);

		arrayItems.forEach((item) => {
			expect(item.value.nodeType).toBe('Expr_BinaryOp_Concat');
			expect(item.value.left).toMatchObject({
				nodeType: 'Expr_ConstFetch',
				name: { parts: ['__DIR__'] },
			});
		});
	});
	it('applies augmentation callbacks to extend module entries', () => {
		const result = buildIndexProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\Plugin\Generated',
			entries: [
				{
					className: 'Demo\Plugin\Rest\BaseController',
					path: 'Rest/BaseController.php',
				},
			],
			augment: [
				(entries) => [
					...entries,
					{
						className: 'Demo\Plugin\Blocks\Registrar',
						path: 'Blocks/Registrar.php',
					},
				],
			],
		});

		const statement = result.statements[0];
		if (!statement || statement.nodeType !== 'Stmt_Return') {
			throw new Error('Expected return statement for module index.');
		}

		const augmentedReturn: PhpStmtReturn = statement as PhpStmtReturn;
		if (!augmentedReturn.expr) {
			throw new Error('Expected return statement expression.');
		}
		assertArrayExpr(augmentedReturn.expr);
		const items = (augmentedReturn.expr.items ?? []) as Array<{
			key: { value: string };
			value: { right: { value: string } };
		}>;

		expect(items.map((item) => item.key.value)).toEqual([
			'Demo\Plugin\Rest\BaseController',
			'Demo\Plugin\Blocks\Registrar',
		]);
		expect(items[1]?.value.right.value).toBe('/Blocks/Registrar.php');
	});
});
