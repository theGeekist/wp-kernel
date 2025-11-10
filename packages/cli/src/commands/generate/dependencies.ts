import path from 'node:path';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { createReporterCLI as buildReporter } from '../../utils/reporter.js';
import { loadWPKernelConfig } from '../../config';
import { buildWorkspace } from '../../workspace';
import { createPipeline } from '../../runtime';
import { registerCoreBuilders, registerCoreFragments } from '../../ir/createIr';
import { buildAdapterExtensionsExtension } from '../../runtime/adapterExtensions';
import { renderSummary } from '../run-generate/summary';
import { validateGeneratedImports } from '../run-generate/validation';
import type {
	BuildGenerateCommandOptions,
	GenerateDependencies,
	GenerateLoadedConfig,
} from './types';
import { buildDefaultReadinessRegistry } from '../../dx';

export function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.generate`;
}

export function resolveWorkspaceRoot(loaded: GenerateLoadedConfig): string {
	return path.dirname(loaded.sourcePath);
}

export function buildGenerateDependencies(
	options: BuildGenerateCommandOptions = {}
): GenerateDependencies {
	return {
		loadWPKernelConfig,
		buildWorkspace,
		createPipeline,
		registerFragments: registerCoreFragments,
		registerBuilders: registerCoreBuilders,
		buildAdapterExtensionsExtension,
		buildReporter,
		renderSummary,
		validateGeneratedImports,
		buildReadinessRegistry: buildDefaultReadinessRegistry,
		...options,
	} satisfies GenerateDependencies;
}
