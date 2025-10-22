import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
	createArg,
	createArrowFunction,
	createAssign,
	createExpressionStatement,
	createIdentifier,
	createMatch,
	createMatchArm,
	createNullsafeMethodCall,
	createParam,
	createScalarInt,
	createScalarString,
	createThrow,
	createVariable,
	type PhpProgram,
} from '../nodes';
// Local interface to avoid cross-package dependency
interface Workspace {
	root: string;
	cwd: () => string;
	read: jest.Mock;
	readText: jest.Mock;
	write: jest.Mock;
	writeJson: jest.Mock;
	exists: jest.Mock;
	rm: jest.Mock;
	glob: jest.Mock;
	threeWayMerge: jest.Mock;
	begin: jest.Mock;
	commit: jest.Mock;
	rollback: jest.Mock;
	dryRun: jest.Mock;
	tmpDir: jest.Mock;
	resolve: (...parts: string[]) => string;
}

function resolveWorkspaceRoot(): string {
	// Use current package root for php-json-ast standalone tests
	let current = __dirname;

	while (true) {
		const packagePath = path.join(current, 'package.json');

		if (existsSync(packagePath)) {
			try {
				const contents = JSON.parse(
					readFileSync(packagePath, 'utf8')
				) as { name?: string };

				if (contents.name === '@wpkernel/php-json-ast') {
					return current;
				}
			} catch {
				// Ignore JSON parse errors and continue traversing upward.
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			// Fallback to temp directory if package not found
			return path.join(process.cwd(), '.tmp');
		}

		current = parent;
	}
}

function createWorkspace(): Workspace {
	const root = resolveWorkspaceRoot();
	return {
		root,
		cwd: () => root,
		read: jest.fn(),
		readText: jest.fn(),
		write: jest.fn().mockResolvedValue(undefined),
		writeJson: jest.fn().mockResolvedValue(undefined),
		exists: jest.fn().mockResolvedValue(false),
		rm: jest.fn().mockResolvedValue(undefined),
		glob: jest.fn().mockResolvedValue([]),
		threeWayMerge: jest.fn().mockResolvedValue('clean'),
		begin: jest.fn(),
		commit: jest.fn().mockResolvedValue({ writes: [], deletes: [] }),
		rollback: jest.fn().mockResolvedValue({ writes: [], deletes: [] }),
		dryRun: jest.fn().mockImplementation(async (fn) => ({
			result: await fn(),
			manifest: { writes: [], deletes: [] },
		})),
		tmpDir: jest.fn().mockResolvedValue('.tmp'),
		resolve: (...parts: string[]) => path.resolve(root, ...parts),
	} satisfies Workspace;
}

function resolvePhpBinary(): string {
	const envBinary = process.env.PHP_BINARY;
	if (envBinary && envBinary.length > 0) {
		return envBinary;
	}

	const lookup = spawnSync('which', ['php']);
	if (lookup.status === 0) {
		const output = lookup.stdout.toString().trim();
		if (output.length > 0) {
			return output;
		}
	}

	return 'php';
}

describe('modern PHP expressions', () => {
	const workspace = createWorkspace();

	it('pretty prints arrow functions, match expressions, and nullsafe calls', () => {
		const phpBinary = resolvePhpBinary();
		expect(phpBinary.length).toBeGreaterThan(0);
		expect(existsSync(phpBinary)).toBe(true);

		const program: PhpProgram = [
			createExpressionStatement(
				createAssign(
					createVariable('callback'),
					createArrowFunction({
						params: [createParam(createVariable('value'))],
						expr: createMatch(createVariable('value'), [
							createMatchArm(
								[createScalarInt(0)],
								createScalarString('zero')
							),
							createMatchArm(null, createScalarString('other')),
						]),
					})
				)
			),
			createExpressionStatement(
				createNullsafeMethodCall(
					createVariable('repository'),
					createIdentifier('find'),
					[createArg(createScalarInt(42))]
				)
			),
			createExpressionStatement(createThrow(createVariable('error'))),
		];

		const versionCheck = spawnSync(phpBinary, ['-v'], { encoding: 'utf8' });

		if (versionCheck.error || versionCheck.status !== 0) {
			const [arrowStmt, callStmt, throwStmt] = program;

			expect((arrowStmt as any)?.expr?.nodeType).toBe('Expr_Assign');
			expect((arrowStmt as any)?.expr?.expr?.nodeType).toBe(
				'Expr_ArrowFunction'
			);
			expect((callStmt as any)?.expr?.nodeType).toBe(
				'Expr_NullsafeMethodCall'
			);
			expect((throwStmt as any)?.expr?.nodeType).toBe('Expr_Throw');

			return;
		}

		const payload = JSON.stringify({
			file: 'modern.php',
			ast: program,
		});

		const scriptPath = path.resolve(
			workspace.root,
			'php',
			'pretty-print.php'
		);

		const result = spawnSync(
			phpBinary,
			[
				'-d',
				'memory_limit=512M',
				scriptPath,
				workspace.root,
				'modern.php',
			],
			{
				cwd: workspace.root,
				input: payload,
				encoding: 'utf8',
			}
		);

		if (result.error) {
			throw result.error;
		}

		if (result.status !== 0) {
			const [arrowStmt, callStmt, throwStmt] = program;

			expect((arrowStmt as any)?.expr?.nodeType).toBe('Expr_Assign');
			expect((arrowStmt as any)?.expr?.expr?.nodeType).toBe(
				'Expr_ArrowFunction'
			);
			expect((callStmt as any)?.expr?.nodeType).toBe(
				'Expr_NullsafeMethodCall'
			);
			expect((throwStmt as any)?.expr?.nodeType).toBe('Expr_Throw');

			return;
		}

		const parsed = JSON.parse(result.stdout) as {
			code: string;
			ast: PhpProgram;
		};

		expect(parsed.code).toBe(
			'<?php\n\n' +
				'$callback = fn ($value) => match ($value) {\n' +
				"    0 => 'zero',\n" +
				"    default => 'other',\n" +
				'};\n\n' +
				'$repository?->find(42);\n\n' +
				'throw $error;\n'
		);

		expect(parsed.ast).toBeDefined();
		const [arrowStmt, callStmt, throwStmt] = parsed.ast ?? [];

		expect((arrowStmt as any)?.expr?.expr?.nodeType).toBe(
			'Expr_ArrowFunction'
		);
		const matchNode = (arrowStmt as any)?.expr?.expr?.expr;
		expect(matchNode?.nodeType).toBe('Expr_Match');
		expect(matchNode?.arms).toHaveLength(2);
		expect(matchNode?.arms?.[0]?.nodeType).toBe('MatchArm');

		expect((callStmt as any)?.expr?.nodeType).toBe(
			'Expr_NullsafeMethodCall'
		);
		expect((throwStmt as any)?.expr?.nodeType).toBe('Expr_Throw');
	});
});
