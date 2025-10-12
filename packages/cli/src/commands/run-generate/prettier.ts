import type * as Prettier from 'prettier';

type PrettierModule = typeof Prettier;

let prettierPromise: Promise<PrettierModule> | null = null;
let phpPluginPromise: Promise<Prettier.Plugin> | null = null;

type PrettierLoaderResult = {
	prettier: PrettierModule;
	phpPlugin: Prettier.Plugin;
};

export async function ensurePrettierLoaded(): Promise<PrettierLoaderResult> {
	const [prettier, phpPlugin] = await Promise.all([
		loadPrettierModule(),
		loadPhpPlugin(),
	]);

	return { prettier, phpPlugin };
}

async function loadPrettierModule(): Promise<PrettierModule> {
	if (!prettierPromise) {
		prettierPromise = import('prettier');
	}

	return prettierPromise;
}

async function loadPhpPlugin(): Promise<Prettier.Plugin> {
	if (!phpPluginPromise) {
		phpPluginPromise = import('@prettier/plugin-php').then((module) => {
			const resolved = module.default ?? module;
			return resolved as Prettier.Plugin;
		});
	}

	return phpPluginPromise!;
}
