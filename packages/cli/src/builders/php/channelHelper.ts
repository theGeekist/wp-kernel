import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import { createPhpChannelHelper as createBasePhpChannelHelper } from '@wpkernel/wp-json-ast';

export function createPhpChannelHelper(): BuilderHelper {
	return createBasePhpChannelHelper<
		PipelineContext,
		BuilderInput,
		BuilderOutput
	>();
}
