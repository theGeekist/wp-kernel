import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import { createModuleResolver } from './module-url';

const resolveFromCli = createModuleResolver();

function isModuleNotFound(error: unknown): boolean {
	return Boolean(
		error &&
			typeof error === 'object' &&
			'code' in (error as { code?: unknown }) &&
			(error as { code?: string }).code === 'MODULE_NOT_FOUND'
	);
}

function tryResolvePackageRoot(pkgName: string): string | null {
	try {
		return path.dirname(resolveFromCli(`${pkgName}/package.json`));
	} catch (error) {
		if (isModuleNotFound(error)) {
			return null;
		}
		throw error;
	}
}

function resolvePackageRoot(pkgName: string): string {
	const root = tryResolvePackageRoot(pkgName);
	if (!root) {
		throw new WPKernelError('DeveloperError', {
			message: `Missing required dependency ${pkgName}.`,
			context: { package: pkgName },
		});
	}
	return root;
}

export function resolveBundledPhpJsonAstIngestionPath(): string {
	const pkgRoot = resolvePackageRoot('@wpkernel/php-json-ast');
	return path.join(pkgRoot, 'php', 'ingest-program.php');
}

export function resolveBundledPhpDriverPrettyPrintPath(): string {
	const pkgRoot = resolvePackageRoot('@wpkernel/php-json-ast');
	return path.join(pkgRoot, 'php', 'pretty-print.php');
}

export function resolveBundledComposerAutoloadPath(
	options: { optional?: boolean } = {}
): string | null {
	const pkgRoot = options.optional
		? tryResolvePackageRoot('@wpkernel/php-json-ast')
		: resolvePackageRoot('@wpkernel/php-json-ast');

	if (!pkgRoot) {
		return null;
	}

	return path.join(pkgRoot, 'vendor', 'autoload.php');
}
