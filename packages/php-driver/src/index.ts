/**
 * Creates a PHP driver installer helper.
 *
 * This helper is responsible for ensuring that the PHP driver is correctly
 * installed and available for use within the project.
 *
 * @category PHP Driver
 */
export { createPhpDriverInstaller } from './installer';
export type { DriverContext, DriverHelper } from './installer';
/**
 * Builds a PHP code pretty printer instance.
 *
 * This function provides a way to format PHP code consistently, which is
 * crucial for generated code readability and maintainability.
 *
 * @category PHP Driver
 */
export { buildPhpPrettyPrinter } from './prettyPrinter';
/**
 * Resolves the absolute path to the PHP pretty print script.
 *
 * This function helps locate the PHP script responsible for formatting PHP code,
 * which is used by the `buildPhpPrettyPrinter` function.
 *
 * @category PHP Driver
 */
export { resolvePrettyPrintScriptPath } from './prettyPrinter/createPhpPrettyPrinter';
export type {
	DriverWorkspace,
	WorkspaceLike,
	PhpPrettyPrintPayload,
	PhpPrettyPrintResult,
	PhpPrettyPrinter,
} from './types';
