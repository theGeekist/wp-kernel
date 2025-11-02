import { buildIndexProgram } from '../indexFile';
import type {
	PhpExprArray,
	PhpStmtExpression,
	PhpStmtReturn,
} from '@wpkernel/php-json-ast';

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
		expect(result.statements).toHaveLength(2);

		const requireStmt = result.statements[0];
		if (!requireStmt || requireStmt.nodeType !== 'Stmt_Expression') {
			throw new Error('Expected require statement to load plugin.php.');
		}

		const requireExpr = (requireStmt as PhpStmtExpression).expr;
		if (!requireExpr || requireExpr.nodeType !== 'Expr_FuncCall') {
			throw new Error('Expected require_once call in plugin index.');
		}
		const requireFunc = requireExpr as typeof requireExpr & {
			name: { nodeType: string; parts?: string[] };
			args: Array<{
				value?: { nodeType?: string; left?: unknown; right?: unknown };
			}>;
		};
		if (requireFunc.name.nodeType !== 'Name' || !requireFunc.name.parts) {
			throw new Error('Expected require_once call name to be a PhpName.');
		}
		expect(requireFunc.name.parts).toEqual(['require_once']);
		const requireArgExpr = requireFunc.args[0]?.value as
			| {
					nodeType: 'Expr_BinaryOp_Concat';
					left?: unknown;
					right?: unknown;
			  }
			| undefined;
		if (
			!requireArgExpr ||
			requireArgExpr.nodeType !== 'Expr_BinaryOp_Concat'
		) {
			throw new Error(
				'Expected require_once argument to concatenate dirname(__DIR__) with /plugin.php.'
			);
		}
		const concatExpr = requireArgExpr;
		const requireLeft = concatExpr.left as
			| {
					nodeType: 'Expr_FuncCall';
					name: { nodeType: string; parts?: string[] };
					args: Array<{ value?: { nodeType?: string } }>;
			  }
			| undefined;
		if (!requireLeft || requireLeft.nodeType !== 'Expr_FuncCall') {
			throw new Error('Expected dirname(__DIR__) in require_once call.');
		}
		const dirnameCall = requireLeft;
		if (dirnameCall.name.nodeType !== 'Name' || !dirnameCall.name.parts) {
			throw new Error('Expected dirname() call name to be a PhpName.');
		}
		expect(dirnameCall.name.parts).toEqual(['dirname']);
		const dirnameArg = dirnameCall.args[0]?.value as
			| { nodeType: 'Expr_ConstFetch'; name: { parts?: string[] } }
			| undefined;
		if (
			!dirnameArg ||
			dirnameArg.nodeType !== 'Expr_ConstFetch' ||
			!dirnameArg.name.parts
		) {
			throw new Error('Expected __DIR__ passed to dirname().');
		}
		expect(dirnameArg.name.parts).toEqual(['__DIR__']);
		const requireRight = concatExpr.right as
			| { nodeType?: string; value?: string }
			| undefined;
		if (!requireRight || requireRight.nodeType !== 'Scalar_String') {
			throw new Error('Expected require_once to append /plugin.php.');
		}
		expect(requireRight.value).toBe('/plugin.php');

		const returnStmt = result.statements[1];
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

		expect(result.statements).toHaveLength(2);

		const statement = result.statements[1];
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
