/**
 * Build Verification: TypeScript Declarations
 *
 * Ensures that .d.ts files and sourcemaps are generated for all entry points.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

describe('Build: TypeScript declarations', () => {
	const distPath = resolve(__dirname, '../../../dist');

	describe('Main exports', () => {
		it('should generate index.d.ts', () => {
			expect(existsSync(resolve(distPath, 'index.d.ts'))).toBe(true);
		});

		it('should generate index.js.map', () => {
			expect(existsSync(resolve(distPath, 'index.js.map'))).toBe(true);
		});
	});

	describe('Subpath exports', () => {
		it('should generate http entry and types', () => {
			// Entry point re-export
			expect(existsSync(resolve(distPath, 'http.js'))).toBe(true);
			// Internal module types
			expect(existsSync(resolve(distPath, 'http/index.d.ts'))).toBe(true);
		});

		it('should generate resource entry and types', () => {
			// Entry point re-export
			expect(existsSync(resolve(distPath, 'resource.js'))).toBe(true);
			// Internal module types
			expect(existsSync(resolve(distPath, 'resource/index.d.ts'))).toBe(
				true
			);
		});

		it('should generate error entry and types', () => {
			// Entry point re-export
			expect(existsSync(resolve(distPath, 'error.js'))).toBe(true);
			// Internal module types
			expect(existsSync(resolve(distPath, 'error/index.d.ts'))).toBe(
				true
			);
		});
	});

	describe('Internal module types', () => {
		it('should generate types for resource internals', () => {
			// With preserveModules, internal files should have types
			expect(existsSync(resolve(distPath, 'resource/define.d.ts'))).toBe(
				true
			);
			expect(existsSync(resolve(distPath, 'resource/store.d.ts'))).toBe(
				true
			);
			expect(existsSync(resolve(distPath, 'resource/cache.d.ts'))).toBe(
				true
			);
		});

		it('should generate types for error internals', () => {
			expect(
				existsSync(resolve(distPath, 'error/KernelError.d.ts'))
			).toBe(true);
			expect(
				existsSync(resolve(distPath, 'error/TransportError.d.ts'))
			).toBe(true);
			expect(
				existsSync(resolve(distPath, 'error/ServerError.d.ts'))
			).toBe(true);
		});

		it('should generate types for http internals', () => {
			expect(existsSync(resolve(distPath, 'http/fetch.d.ts'))).toBe(true);
			expect(existsSync(resolve(distPath, 'http/types.d.ts'))).toBe(true);
		});
	});
});
