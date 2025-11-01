import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const SOURCE_PATH = path.resolve(
	__dirname,
	'..',
	'prettyPrinter',
	'createPhpPrettyPrinter.ts'
);

function transpilePrettyPrinter(): string {
	const source = fs.readFileSync(SOURCE_PATH, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ES2022,
			moduleResolution: ts.ModuleResolutionKind.Node10,
			esModuleInterop: true,
		},
		fileName: SOURCE_PATH,
	});

	return outputText;
}

describe('pretty printer ESM integration', () => {
	it('resolves the pretty print script via native import.meta detection', () => {
		const temporaryDirectory = fs.mkdtempSync(
			path.join(os.tmpdir(), 'wpk-php-driver-esm-')
		);
		const distDirectory = path.join(temporaryDirectory, 'dist');
		fs.mkdirSync(distDirectory, { recursive: true });
		const modulePath = path.join(
			distDirectory,
			'createPhpPrettyPrinter.js'
		);
		fs.writeFileSync(modulePath, transpilePrettyPrinter(), 'utf8');

		const phpBridgeRoot = path.join(temporaryDirectory, 'php');
		fs.mkdirSync(phpBridgeRoot, { recursive: true });
		fs.copyFileSync(
			path.resolve(__dirname, '..', '..', 'php', 'pretty-print.php'),
			path.join(phpBridgeRoot, 'pretty-print.php')
		);

		const stubModuleRoot = path.join(
			temporaryDirectory,
			'node_modules',
			'@wpkernel',
			'core'
		);
		fs.mkdirSync(stubModuleRoot, { recursive: true });
		fs.writeFileSync(
			path.join(stubModuleRoot, 'package.json'),
			JSON.stringify({
				type: 'module',
				exports: {
					'./error': './error.js',
					'./contracts': './contracts.js',
				},
			}),
			'utf8'
		);
		fs.writeFileSync(
			path.join(stubModuleRoot, 'error.js'),
			'export class WPKernelError extends Error {}',
			'utf8'
		);
		fs.writeFileSync(
			path.join(stubModuleRoot, 'contracts.js'),
			'export const WPK_NAMESPACE = "wpk";',
			'utf8'
		);

		const moduleUrl = pathToFileURL(modulePath).href;
		const script = [
			`import { resolvePrettyPrintScriptPath } from ${JSON.stringify(moduleUrl)};`,
			'const resolved = resolvePrettyPrintScriptPath();',
			'console.log(resolved);',
		].join('\n');

		const result = spawnSync(
			process.execPath,
			['--input-type=module', '-e', script],
			{
				encoding: 'utf8',
				env: {
					...process.env,
					NODE_NO_WARNINGS: '1',
				},
			}
		);

		try {
			expect(result.error).toBeUndefined();
			if (result.status !== 0) {
				throw new Error(
					`ESM harness failed: code=${result.status}, stderr=${result.stderr}`
				);
			}

			const resolvedPath = result.stdout.trim();
			const expectedPath = path.resolve(
				temporaryDirectory,
				'php',
				'pretty-print.php'
			);
			const normalisePath = (candidate: string) =>
				fs.realpathSync.native?.(candidate) ??
				fs.realpathSync(candidate);
			expect(normalisePath(resolvedPath)).toBe(
				normalisePath(expectedPath)
			);
		} finally {
			fs.rmSync(temporaryDirectory, { recursive: true, force: true });
		}
	});
});
