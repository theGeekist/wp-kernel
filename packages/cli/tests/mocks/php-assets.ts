const PRETTY_PATH = '/bundle/php-json-ast/php/pretty-print.php';
const INGESTION_PATH = '/bundle/php-json-ast/php/ingest-program.php';
const COMPOSER_AUTOLOAD_PATH = '/bundle/php-json-ast/vendor/autoload.php';

export const phpAssetsMock = {
	resolveBundledPhpDriverPrettyPrintPath: jest
		.fn()
		.mockReturnValue(PRETTY_PATH),
	resolveBundledPhpJsonAstIngestionPath: jest
		.fn()
		.mockReturnValue(INGESTION_PATH),
	resolveBundledComposerAutoloadPath: jest
		.fn()
		.mockReturnValue(COMPOSER_AUTOLOAD_PATH),
};

export function resetPhpAssetsMock(): void {
	phpAssetsMock.resolveBundledPhpDriverPrettyPrintPath.mockClear();
	phpAssetsMock.resolveBundledPhpJsonAstIngestionPath.mockClear();
	phpAssetsMock.resolveBundledComposerAutoloadPath.mockClear();
	phpAssetsMock.resolveBundledPhpDriverPrettyPrintPath.mockReturnValue(
		PRETTY_PATH
	);
	phpAssetsMock.resolveBundledPhpJsonAstIngestionPath.mockReturnValue(
		INGESTION_PATH
	);
	phpAssetsMock.resolveBundledComposerAutoloadPath.mockReturnValue(
		COMPOSER_AUTOLOAD_PATH
	);
}
