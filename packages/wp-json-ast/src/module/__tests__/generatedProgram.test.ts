import {
	buildReturn,
	buildScalarString,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import { buildGeneratedModuleProgram } from '../generatedProgram';

describe('buildGeneratedModuleProgram', () => {
	it('wraps statements in a namespace with strict types and guard comments', () => {
		const statements: readonly PhpStmt[] = [
			buildReturn(buildScalarString('demo')),
		];

		const program = buildGeneratedModuleProgram({
			namespace: 'Demo\\Module',
			docblock: ['Generated from demo'],
			metadata: { kind: 'base-controller' },
			statements,
		});

		expect(program).toHaveLength(2);

		const declareStmt = program[0] as { nodeType: string };
		const namespaceStmt = program[1] as {
			nodeType: string;
			stmts?: PhpStmt[];
			attributes?: { comments?: { text: string }[] };
		};

		expect(declareStmt.nodeType).toBe('Stmt_Declare');
		expect(namespaceStmt.nodeType).toBe('Stmt_Namespace');
		expect(namespaceStmt.attributes?.comments?.[0]?.text).toContain(
			'Generated from demo'
		);

		expect(namespaceStmt.stmts).toHaveLength(3);
		const beginGuard = namespaceStmt.stmts?.[0] as {
			attributes?: { comments?: { text: string }[] };
		};
		const bodyStmt = namespaceStmt.stmts?.[1] as { nodeType: string };
		const endGuard = namespaceStmt.stmts?.[2] as {
			attributes?: { comments?: { text: string }[] };
		};
		expect(beginGuard?.attributes?.comments?.[0]?.text).toContain(
			'WPK:BEGIN AUTO'
		);
		expect(bodyStmt?.nodeType).toBe('Stmt_Return');
		expect(endGuard?.attributes?.comments?.[0]?.text).toContain(
			'WPK:END AUTO'
		);
	});

	it('applies docblocks directly when no namespace is provided', () => {
		const statements: readonly PhpStmt[] = [
			buildReturn(buildScalarString('demo')),
		];

		const program = buildGeneratedModuleProgram({
			namespace: null,
			docblock: ['Generated file'],
			metadata: { kind: 'index-file' },
			statements,
		});

		expect(program).toHaveLength(4);
		const docblockStmt = program[1] as {
			attributes?: { comments?: { text: string }[] };
		};
		expect(docblockStmt.attributes?.comments?.[0]?.text).toContain(
			'Generated file'
		);
	});
});
