import { normalizeIdentityConfig, normalizeStorageConfig } from '../helpers';

describe('persistence helpers', () => {
	describe('normalizeIdentityConfig', () => {
		it('returns null when identity is missing', () => {
			expect(normalizeIdentityConfig(undefined)).toBeNull();
		});

		it('normalises numeric identity with defaults and guards', () => {
			expect(normalizeIdentityConfig({ type: 'number' })).toEqual({
				cast: 'int',
				guards: ['is_numeric'],
				param: 'id',
				type: 'number',
			});
		});

		it('normalises string identity and omits cast', () => {
			expect(normalizeIdentityConfig({ type: 'string' })).toEqual({
				guards: ['is_string'],
				param: 'slug',
				type: 'string',
			});
		});
	});

	describe('normalizeStorageConfig', () => {
		it('returns null when storage is missing', () => {
			expect(normalizeStorageConfig(undefined)).toBeNull();
		});

		it('normalises wp-post storage metadata', () => {
			expect(
				normalizeStorageConfig({
					mode: 'wp-post',
					statuses: ['publish', 'draft'],
					supports: ['editor', 'title'],
					meta: {
						beta: { single: false, type: 'number' },
						alpha: { single: true, type: 'string' },
					},
				})
			).toEqual({
				meta: {
					alpha: { single: true, type: 'string' },
					beta: { single: false, type: 'number' },
				},
				mode: 'wp-post',
				statuses: ['draft', 'publish'],
				supports: ['editor', 'title'],
			});
		});

		it('normalises wp-option storage metadata', () => {
			expect(
				normalizeStorageConfig({ mode: 'wp-option', option: 'demo' })
			).toEqual({ mode: 'wp-option', option: 'demo' });
		});
	});
});
