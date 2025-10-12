import path from 'node:path';
import { sanitizeNamespace } from '@geekist/wp-kernel/namespace';
import { KernelError } from '@geekist/wp-kernel/error';
import type { BuildIrOptions, IRv1 } from './types';
import { toWorkspaceRelative } from '../utils';
import { createSchemaAccumulator, loadConfiguredSchemas } from './schema';
import { buildResources } from './resource-builder';
import { collectPolicyHints } from './policies';
import {
	sortBlocks,
	sortPolicies,
	sortResources,
	sortSchemas,
} from './ordering';
import { discoverBlocks } from './block-discovery';
import { createPhpNamespace } from './php';

export async function buildIr(options: BuildIrOptions): Promise<IRv1> | never {
	const sanitizedNamespace = sanitizeNamespace(options.namespace);
	if (!sanitizedNamespace) {
		throw new KernelError('ValidationError', {
			message: `Unable to sanitise namespace "${options.namespace}" during IR construction.`,
			context: { namespace: options.namespace },
		});
	}

	const schemaAccumulator = createSchemaAccumulator();
	await loadConfiguredSchemas(options, schemaAccumulator);

	const resources = await buildResources(
		options,
		schemaAccumulator,
		sanitizedNamespace
	);
	const policies = collectPolicyHints(resources);
	const workspaceRoot = path.dirname(options.sourcePath);
	const blocks = await discoverBlocks(workspaceRoot);

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace: options.namespace,
			sourcePath: toWorkspaceRelative(options.sourcePath),
			origin: options.origin,
			sanitizedNamespace,
		},
		config: options.config,
		schemas: sortSchemas(schemaAccumulator.entries),
		resources: sortResources(resources),
		policies: sortPolicies(policies),
		blocks: sortBlocks(blocks),
		php: {
			namespace: createPhpNamespace(sanitizedNamespace),
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	};

	return ir;
}
