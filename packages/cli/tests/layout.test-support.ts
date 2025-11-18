import defaultLayoutManifest from '../../../layout.manifest.json' assert { type: 'json' };
import {
	loadLayoutFromWorkspace,
	resolveLayoutFromManifest,
	type ResolvedLayout,
} from '../src/layout/manifest';
import { buildWorkspace } from '../src/workspace';

/**
 * Test helper for resolving layout IDs from layout.manifest.json via the production loader.
 *
 * Keeps tests aligned to the manifest so path expectations do not bake in
 * `.wpk` or `.generated` strings.
 * @param options
 * @param options.cwd
 * @param options.overrides
 * @param options.strict
 */
export async function loadTestLayout(
	options: {
		readonly cwd?: string;
		readonly overrides?: Record<string, string>;
		readonly strict?: boolean;
	} = {}
): Promise<ResolvedLayout> {
	const cwd = options.cwd ?? process.cwd();
	const strict = options.strict ?? true;
	const workspace = buildWorkspace(cwd);
	const layout = await loadLayoutFromWorkspace({
		workspace,
		overrides: options.overrides,
		strict,
	});
	if (!layout) {
		throw new Error('layout.manifest.json not found for tests.');
	}

	return layout;
}

export async function resolveLayoutPath(
	id: string,
	options?: Parameters<typeof loadTestLayout>[0]
): Promise<string> {
	const layout = await loadTestLayout(options);
	return layout.resolve(id);
}

export function loadTestLayoutSync(
	options: {
		readonly overrides?: Record<string, string>;
	} = {}
): ResolvedLayout {
	return resolveLayoutFromManifest({
		manifest: defaultLayoutManifest,
		overrides: options.overrides,
	});
}
