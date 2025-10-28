import type { PhpProgram } from '@wpkernel/php-json-ast';

import type { RestControllerClassConfig } from './types';

/**
 * Placeholder for the upcoming module-level factory described in
 * {@link ../../docs/cli-ast-reduction-plan.md#task-2-1-blueprint-–-rest-controllers}.
 *
 * Task 2.1 calls for a `buildRestControllerModule` helper that can emit the base controller,
 * registrar, and every resource controller class.  This stub keeps the contract visible to
 * contributors while the implementation work remains pending.
 */
export interface RestControllerModuleConfig {
	/**
	 * Reference to the base namespace segments and per-resource controller definitions.
	 *
	 * The reduction plan outlines this shape in the Task 2.1 blueprint; keep the structure
	 * aligned with the document so the CLI adapter can translate its IR without drift.
	 */
	readonly controllers: readonly RestControllerClassConfig[];
	/**
	 * Fully-qualified namespace for the generated module.  See the Task 2.1 execution plan
	 * for the expected namespace layering and registrar placement.
	 */
	readonly namespace: string;
	/**
	 * Optional hook for injecting the abstract base controller until the concrete generator
	 * is migrated.  The blueprint notes that the module builder must emit the base class
	 * alongside resource controllers; exposing the toggle here keeps that requirement visible.
	 */
	readonly includeBaseController?: boolean;
}

/**
 * Future implementation note:
 *  - Should assemble a `PhpProgram` that contains the base controller, registrar index, and
 *    each concrete controller by delegating to `buildRestControllerClass`.
 *  - Must consolidate shared imports and metadata handling per the roadmap guidance.
 *  - See the Task 2.1 execution plan for integration expectations once the CLI consumes it.
 * @param _config
 */
export function buildRestControllerModule(
	_config: RestControllerModuleConfig
): PhpProgram {
	throw new Error(
		'buildRestControllerModule is a placeholder. See packages/wp-json-ast/docs/cli-ast-reduction-plan.md for details.'
	);
}
