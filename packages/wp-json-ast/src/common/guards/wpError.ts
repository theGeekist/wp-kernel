/**
 * @fileoverview
 * This file re-exports everything from the `../../resource/errors` module.
 * It is used to make the guards available to other modules in the `common` directory.
 */
export {
	buildIsWpErrorGuard,
	buildReturnIfWpError,
	buildWpErrorExpression,
	buildWpErrorReturn,
	type WpErrorExpressionOptions,
	type WpErrorGuardOptions,
	type WpErrorReturnOptions,
} from '../../resource/errors';
