import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { KernelError } from '@wpkernel/core/error';

declare global {
	var __WPK_CLI_MODULE_URL__: string | undefined;
}

export function getModuleUrl(): string {
	const moduleUrl = globalThis.__WPK_CLI_MODULE_URL__;

	if (typeof moduleUrl === 'string') {
		return moduleUrl;
	}

	const importMetaUrl = resolveImportMetaUrl();

	if (typeof importMetaUrl === 'string' && importMetaUrl.length > 0) {
		return importMetaUrl;
	}

	const moduleFilename = resolveModuleFilename();

	if (moduleFilename) {
		return pathToFileURL(moduleFilename).href;
	}

	throw new KernelError('DeveloperError', {
		message: 'Unable to resolve CLI module URL for init command.',
	});
}

function resolveImportMetaUrl(): string | undefined {
	try {
		return Function(
			'return (function(){ try { return eval("import.meta.url"); } catch (error) { return undefined; } })();'
		)();
	} catch (_error) {
		// Some environments (notably CommonJS transpilation targets) throw a syntax error when
		// evaluating `import.meta`. Treat those as an expected absence and fall back to other
		// resolution strategies instead of surfacing the error.
		return undefined;
	}
}

function resolveModuleFilename(): string | undefined {
	if (typeof __filename === 'string' && __filename.length > 0) {
		return __filename;
	}

	if (
		typeof module === 'object' &&
		module !== null &&
		'filename' in module &&
		typeof (module as NodeModule).filename === 'string'
	) {
		return (module as NodeModule).filename;
	}

	return undefined;
}

export function getCliPackageRoot(): string {
	let current = path.dirname(fileURLToPath(getModuleUrl()));

	while (true) {
		const pkgPath = path.join(current, 'package.json');

		try {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
				name?: string;
			};

			if (pkg?.name === '@wpkernel/cli') {
				return current;
			}
		} catch (error) {
			if (!isNoEntryError(error)) {
				throw error;
			}
		}

		const parent = path.dirname(current);

		if (parent === current) {
			break;
		}

		current = parent;
	}

	throw new KernelError('DeveloperError', {
		message: 'Unable to locate CLI package root.',
	});
}

function isNoEntryError(error: unknown): error is { code?: string } {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: string }) &&
		(error as { code?: string }).code === 'ENOENT'
	);
}
