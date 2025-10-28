/* eslint-env jest */
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../src/next/runtime/types';
import type { IRv1 } from '../../src/next/ir/publicTypes';
import type { WPKernelConfigV1 } from '../../src/config/types';
import { makeWorkspaceMock } from '../workspace.test-support';
import type { Workspace } from '../../src/next/workspace/types';

const DEFAULT_CONFIG_SOURCE = 'tests.config.ts';

export function createReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

export function createPipelineContext(
	overrides?: Partial<PipelineContext>
): PipelineContext {
	const workspace = makeWorkspaceMock<Workspace>({
		root: '/workspace',
	});

	const base: PipelineContext = {
		workspace,
		reporter: createReporter(),
		phase: 'generate',
	};

	return {
		...base,
		...overrides,
		workspace: overrides?.workspace ?? base.workspace,
		reporter: overrides?.reporter ?? base.reporter,
		phase: overrides?.phase ?? base.phase,
	};
}

export function createBuilderInput(
	overrides?: Partial<BuilderInput>
): BuilderInput {
	const namespace =
		overrides?.options?.namespace ??
		overrides?.options?.config?.namespace ??
		'demo-plugin';
	const config: WPKernelConfigV1 =
		overrides?.options?.config ??
		({
			version: 1,
			namespace,
			resources: {},
			schemas: {},
		} satisfies WPKernelConfigV1);

	const base: BuilderInput = {
		phase: 'generate',
		options: {
			config,
			namespace,
			origin: DEFAULT_CONFIG_SOURCE,
			sourcePath: DEFAULT_CONFIG_SOURCE,
		},
		ir: null,
	};

	return {
		...base,
		...overrides,
		options: {
			...base.options,
			...overrides?.options,
			config,
			namespace,
		},
	};
}

export function createBuilderOutput(): BuilderOutput {
	return {
		actions: [],
		queueWrite: jest.fn(),
	};
}

export function createMinimalIr(overrides?: Partial<IRv1>): IRv1 {
	const namespace = overrides?.meta?.namespace ?? 'DemoPlugin';

	const baseConfig: WPKernelConfigV1 = overrides?.config ?? {
		version: 1,
		namespace,
		resources: {},
		schemas: {},
	};

	const base: IRv1 = {
		meta: {
			version: 1,
			namespace,
			sourcePath: overrides?.meta?.sourcePath ?? DEFAULT_CONFIG_SOURCE,
			origin: overrides?.meta?.origin ?? 'typescript',
			sanitizedNamespace:
				overrides?.meta?.sanitizedNamespace ??
				namespace.replace(/[^A-Za-z0-9]+/gu, ''),
		},
		config: baseConfig,
		schemas: overrides?.schemas ?? [],
		resources: overrides?.resources ?? [],
		policies: overrides?.policies ?? [],
		policyMap: {
			definitions: overrides?.policyMap?.definitions ?? [],
			fallback: {
				capability:
					overrides?.policyMap?.fallback?.capability ??
					`manage_${namespace.toLowerCase()}`,
				appliesTo:
					overrides?.policyMap?.fallback?.appliesTo ?? 'resource',
			},
			missing: overrides?.policyMap?.missing ?? [],
			unused: overrides?.policyMap?.unused ?? [],
			warnings: overrides?.policyMap?.warnings ?? [],
			sourcePath: overrides?.policyMap?.sourcePath,
		},
		blocks: overrides?.blocks ?? [],
		php: {
			namespace: overrides?.php?.namespace ?? namespace,
			autoload: overrides?.php?.autoload ?? 'inc/',
			outputDir: overrides?.php?.outputDir ?? '.generated/php',
		},
		diagnostics: overrides?.diagnostics ?? [],
	};

	return {
		...base,
		...overrides,
		meta: { ...base.meta, ...overrides?.meta },
		config: overrides?.config ?? baseConfig,
		policyMap: {
			...base.policyMap,
			...overrides?.policyMap,
			fallback: {
				...base.policyMap.fallback,
				...overrides?.policyMap?.fallback,
			},
		},
		php: { ...base.php, ...overrides?.php },
	};
}
