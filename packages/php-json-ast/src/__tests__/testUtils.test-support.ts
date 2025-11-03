// Test utilities for php-json-ast package
import path from 'node:path';
import type { PipelineContext } from '../programBuilder';
import {
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '../builderChannel';
import { resetPhpAstChannel } from '../context';
import { createReporterMock } from '@wpkernel/test-utils/shared/reporter';

export function createTestPipelineContext(): PipelineContext {
	return {
		workspace: {
			root: '/workspace',
			resolve: (...parts: string[]) => path.join('/workspace', ...parts),
			cwd: () => '/workspace',
			write: jest.fn().mockResolvedValue(undefined),
			exists: jest.fn().mockResolvedValue(false),
		},
		phase: 'generate' as const,
		reporter: createReporterMock(),
	};
}

export function resetTestChannels(context: PipelineContext): void {
	resetPhpBuilderChannel(context);
	resetPhpAstChannel(context);
}

export function getTestBuilderQueue(context: PipelineContext) {
	return getPhpBuilderChannel(context).pending();
}
