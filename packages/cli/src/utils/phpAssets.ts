import path from 'node:path';
import { getCliPackageRoot } from './module-url';

export function resolveBundledPhpJsonAstIngestionPath(): string {
	return path.resolve(
		getCliPackageRoot(),
		'dist',
		'packages',
		'php-json-ast',
		'php',
		'ingest-program.php'
	);
}

export function resolveBundledPhpDriverPrettyPrintPath(): string {
	return path.resolve(
		getCliPackageRoot(),
		'dist',
		'packages',
		'php-driver',
		'php',
		'pretty-print.php'
	);
}

export function resolveBundledComposerAutoloadPath(): string {
	return path.resolve(getCliPackageRoot(), 'vendor', 'autoload.php');
}
