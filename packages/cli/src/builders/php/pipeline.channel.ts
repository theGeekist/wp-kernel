import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import { createPhpChannelHelper as createBasePhpChannelHelper } from '@wpkernel/wp-json-ast';

/**
 * Creates a PHP channel helper.
 *
 * This helper is responsible for setting up the communication channel
 * for PHP-related operations within the builder pipeline.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for PHP channel management.
 */
export function createPhpChannelHelper(): BuilderHelper {
	return createBasePhpChannelHelper<
		PipelineContext,
		BuilderInput,
		BuilderOutput
	>();
}
