import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createBundlerFragment(): IrFragment {
	return createHelper({
		key: 'ir.bundler.core',
		kind: 'fragment',
		dependsOn: ['ir.layout.core'],
		apply({ output, input }: IrFragmentApplyOptions) {
			const layout = input.draft.layout;
			if (!layout) {
				return;
			}

			try {
				const entryPath = layout.resolve('ui.generated');
				const bundler = {
					entryPath: `${entryPath}/index.tsx`,
					configPath: layout.resolve('bundler.config'),
					assetsPath: layout.resolve('bundler.assets'),
					viteConfigPath: 'vite.config.ts',
				};

				output.assign({ bundler });
			} catch {
				// Some test manifests omit bundler/UI paths; skip in that case.
			}
		},
	});
}
