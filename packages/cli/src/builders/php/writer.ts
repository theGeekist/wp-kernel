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

export function createPhpProgramWriterHelper(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper {
	return createBasePhpProgramWriterHelper<
		PipelineContext,
		BuilderInput,
		BuilderOutput
	>(options);
}
