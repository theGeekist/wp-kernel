import type { IRv1 } from '../../ir/publicTypes';
import type { PluginLoaderUiConfig } from './types';

export function buildUiConfig(ir: IRv1): PluginLoaderUiConfig | null {
	const resources = ir.ui?.resources ?? [];
	const loader = ir.ui?.loader;
	if (resources.length === 0 || !loader) {
		return null;
	}

	return {
		handle: loader.handle,
		assetPath: loader.assetPath,
		scriptPath: loader.scriptPath,
		localizationObject: loader.localizationObject,
		namespace: loader.namespace,
		resources,
	};
}
