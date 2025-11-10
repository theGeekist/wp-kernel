import { createReporterCLI as createReporter } from '../../utils/reporter.js';
import { loadWPKernelConfig } from '../../config';
import { buildWorkspace, promptConfirm } from '../../workspace';
import { createPatcher } from '../../builders';
import { appendApplyLog } from './logging';
import { createBackups } from './backups';
import { buildBuilderOutput, readManifest } from './io';
import { ensureGitRepository, resolveWorkspaceRoot } from './workspace';
import { buildDefaultReadinessRegistry } from '../../dx';
import type {
	ApplyCommandDependencies,
	BuildApplyCommandOptions,
} from './types';

export function mergeDependencies(
	options: BuildApplyCommandOptions
): ApplyCommandDependencies {
	return {
		loadWPKernelConfig,
		buildWorkspace,
		createPatcher,
		buildReporter: createReporter,
		buildBuilderOutput,
		readManifest,
		resolveWorkspaceRoot,
		promptConfirm,
		ensureGitRepository,
		createBackups,
		appendApplyLog,
		buildReadinessRegistry: buildDefaultReadinessRegistry,
		...options,
	} satisfies ApplyCommandDependencies;
}
