import type * as Prettier from 'prettier';

type PrettierModule = typeof Prettier;

let prettierPromise: Promise<PrettierModule> | null = null;
let phpPluginPromise: Promise<Prettier.Plugin> | null = null;

export async function ensurePrettierLoaded(): Promise<PrettierModule> {
	if (!prettierPromise) {
		prettierPromise = import('prettier');
	}

	return prettierPromise;
}

export async function ensurePhpPluginLoaded(): Promise<Prettier.Plugin> {
	if (!phpPluginPromise) {
		phpPluginPromise = import('@prettier/plugin-php').then((module) => {
			const resolved = module.default ?? module;
			return resolved as Prettier.Plugin;
		});
	}

	return phpPluginPromise!;
}
