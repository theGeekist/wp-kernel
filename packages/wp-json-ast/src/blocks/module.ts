import { buildBlockManifestFile } from './manifest';
import { buildBlockRegistrarFile } from './registrar';
import { buildRenderStub } from './render';
import type {
	BlockModuleConfig,
	BlockModuleFileEntry,
	BlockModuleResult,
} from './types';

/**
 * @param    config
 * @category WordPress AST
 */
export function buildBlockModule(config: BlockModuleConfig): BlockModuleResult {
	const files: BlockModuleFileEntry[] = [];
	const hooks = config.hooks ?? {};

	if (Object.keys(config.manifest.entries).length > 0) {
		const manifestFile = buildBlockManifestFile(
			config.origin,
			config.manifest
		);

		files.push(hooks.manifestFile?.(manifestFile) ?? manifestFile);
	}

	const registrarFile = buildBlockRegistrarFile(
		config.origin,
		config.namespace,
		config.registrarFileName
	);

	files.push(hooks.registrarFile?.(registrarFile) ?? registrarFile);

	const renderStubs = (config.renderStubs ?? []).map((descriptor) => {
		const stub = buildRenderStub(descriptor);
		return hooks.renderStub?.(stub, descriptor) ?? stub;
	});

	return { files, renderStubs } satisfies BlockModuleResult;
}
