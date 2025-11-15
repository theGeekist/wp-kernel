import path from 'node:path';
import type { IRv1 } from '../../ir/publicTypes';
import { sanitizeNamespace } from '../../adapters/extensions';
import type {
	PluginLoaderUiConfig,
	PluginLoaderUiResourceDescriptor,
} from './types';

export const DEFAULT_UI_ASSET_PATH = path.posix.join(
	'build',
	'index.asset.json'
);
export const DEFAULT_UI_SCRIPT_PATH = path.posix.join('build', 'index.js');
export const UI_LOCALIZATION_OBJECT = 'wpKernelUISettings';

export function buildUiConfig(
	ir: IRv1,
	resources: readonly PluginLoaderUiResourceDescriptor[]
): PluginLoaderUiConfig | null {
	if (resources.length === 0) {
		return null;
	}

	const namespaceCandidate =
		ir.meta.sanitizedNamespace ?? ir.meta.namespace ?? '';
	const slug = sanitizeNamespace(namespaceCandidate);
	if (!slug) {
		return null;
	}

	return {
		handle: `wp-${slug}-ui`,
		assetPath: DEFAULT_UI_ASSET_PATH,
		scriptPath: DEFAULT_UI_SCRIPT_PATH,
		localizationObject: UI_LOCALIZATION_OBJECT,
		namespace: ir.meta.namespace,
		resources,
	};
}
