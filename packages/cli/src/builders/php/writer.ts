import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	createPhpProgramWriterHelper as createBasePhpProgramWriterHelper,
	type CreatePhpProgramWriterHelperOptions,
} from '@wpkernel/wp-json-ast';

export type { CreatePhpProgramWriterHelperOptions } from '@wpkernel/wp-json-ast';

/**
 * Creates a PHP builder helper for writing PHP program files to the filesystem.
 *
 * This helper takes the generated PHP program representations from the channel
 * and writes them to the appropriate output directory, using the configured
 * PHP driver for formatting and pretty-printing.
 *
 * @category PHP Builder
 * @param    options - Options for configuring the PHP program writer.
 * @returns A `BuilderHelper` instance for writing PHP program files.
 */
export function createPhpProgramWriterHelper(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper {
	return createBasePhpProgramWriterHelper<
		PipelineContext,
		BuilderInput,
		BuilderOutput
	>(options);
}
