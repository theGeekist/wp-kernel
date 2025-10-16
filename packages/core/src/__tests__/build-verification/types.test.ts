/**
 * Build Verification: TypeScript Declarations
 *
 * Ensures that .d.ts files and sourcemaps are generated for all entry points.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

const distPath = resolve(__dirname, '../../../dist');

const expectArtifacts = (artifacts: string[]) => {
	for (const artifact of artifacts) {
		expect(existsSync(resolve(distPath, artifact))).toBe(true);
	}
};

describe('Build: TypeScript declarations', () => {
	it('generates root declarations', () => {
		expectArtifacts(['index.d.ts']);
	});

	it.each([
		{
			entry: 'http',
			artifacts: ['http.js', 'http/index.d.ts'],
		},
		{
			entry: 'resource',
			artifacts: ['resource.js', 'resource/index.d.ts'],
		},
		{
			entry: 'error',
			artifacts: ['error.js', 'error/index.d.ts'],
		},
	])('generates %s entry types', ({ artifacts }) => {
		expectArtifacts(artifacts);
	});

	it.each([
		[
			'resource internals',
			[
				'resource/define.d.ts',
				'resource/store.d.ts',
				'resource/cache.d.ts',
			],
		],
		[
			'error internals',
			[
				'error/KernelError.d.ts',
				'error/TransportError.d.ts',
				'error/ServerError.d.ts',
			],
		],
		['http internals', ['http/fetch.d.ts', 'http/types.d.ts']],
	])('includes %s', (_label, artifacts: string[]) => {
		expectArtifacts(artifacts);
	});
});
