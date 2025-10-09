/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';
import { KernelError } from '../../error';

interface Thing {
	id: number;
	title: string;
	description: string;
}

describe('defineResource - config validation', () => {
	describe('config validation', () => {
		describe('name validation', () => {
			it('should throw DeveloperError when name is missing', () => {
				expect(() => {
					defineResource({
						name: '',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw DeveloperError with correct error code for missing name', () => {
				try {
					defineResource({
						name: '',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
					fail('Should have thrown');
				} catch (e) {
					expect(e).toBeInstanceOf(KernelError);
					const error = e as KernelError;
					expect(error.code).toBe('DeveloperError');
					expect(error.message).toContain('name');
				}
			});

			it('should reject uppercase names', () => {
				expect(() => {
					defineResource({
						name: 'Thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should reject names with spaces', () => {
				expect(() => {
					defineResource({
						name: 'my thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should reject names with underscores', () => {
				expect(() => {
					defineResource({
						name: 'my_thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should accept valid kebab-case names', () => {
				expect(() => {
					defineResource({
						name: 'my-thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept names with numbers', () => {
				expect(() => {
					defineResource({
						name: 'thing-123',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept single-word names', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});
		});

		describe('routes validation', () => {
			it('should throw when routes is missing', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: undefined as never,
					});
				}).toThrow(KernelError);
			});

			it('should throw when routes is empty object', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {},
					});
				}).toThrow(KernelError);
			});

			it('should accept config with only list route', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept config with only get route', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							get: { path: '/wpk/v1/things/:id', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept config with all CRUD routes', () => {
				expect(() => {
					defineResource<Thing>({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
							get: { path: '/wpk/v1/things/:id', method: 'GET' },
							create: {
								path: '/wpk/v1/things',
								method: 'POST',
							},
							update: {
								path: '/wpk/v1/things/:id',
								method: 'PUT',
							},
							remove: {
								path: '/wpk/v1/things/:id',
								method: 'DELETE',
							},
						},
					});
				}).not.toThrow();
			});

			it('should throw for invalid route name', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							fetch: { path: '/wpk/v1/things', method: 'GET' },
						} as never,
					});
				}).toThrow(KernelError);
			});
		});

		describe('route definition validation', () => {
			it('should throw when route is null', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: null as never,
						},
					});
				}).toThrow(KernelError);

				try {
					defineResource({
						name: 'thing',
						routes: {
							list: null as never,
						},
					});
				} catch (e) {
					expect(e).toBeInstanceOf(KernelError);
					const error = e as KernelError;
					expect(error.code).toBe('DeveloperError');
					expect(error.message).toContain('must be an object');
				}
			});

			it('should throw when route is not an object', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: 'not an object' as never,
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw when route.path is missing', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { method: 'GET' } as never,
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw when route.method is missing', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things' } as never,
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw for invalid HTTP method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: {
								path: '/wpk/v1/things',
								method: 'FETCH' as never,
							},
						},
					});
				}).toThrow(KernelError);
			});

			it('should accept GET method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept POST method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							create: {
								path: '/wpk/v1/things',
								method: 'POST',
							},
						},
					});
				}).not.toThrow();
			});

			it('should accept PUT method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							update: {
								path: '/wpk/v1/things/:id',
								method: 'PUT',
							},
						},
					});
				}).not.toThrow();
			});

			it('should accept PATCH method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							update: {
								path: '/wpk/v1/things/:id',
								method: 'PATCH',
							},
						},
					});
				}).not.toThrow();
			});

			it('should accept DELETE method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							remove: {
								path: '/wpk/v1/things/:id',
								method: 'DELETE',
							},
						},
					});
				}).not.toThrow();
			});
		});

		describe('store configuration validation', () => {
			it('should reject non-object store configuration', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
						store: null as never,
					});
				}).toThrow(KernelError);
			});

			it('should reject store.getId when not a function', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
						store: {
							// @ts-expect-error runtime validation
							getId: 'not-a-function',
						},
					});
				}).toThrow(KernelError);
			});

			it('should reject store.getQueryKey when not a function', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
						store: {
							// @ts-expect-error runtime validation
							getQueryKey: 'not-a-function',
						},
					});
				}).toThrow(KernelError);
			});

			it('should accept valid store overrides', () => {
				expect(() => {
					defineResource<{ slug: string }>({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
						store: {
							getId: (item) => item.slug,
							getQueryKey: (query) =>
								`custom:${JSON.stringify(query ?? {})}`,
							initialState: { items: {} },
						},
					});
				}).not.toThrow();
			});
		});
	});
});
