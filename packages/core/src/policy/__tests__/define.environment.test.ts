import '@wordpress/jest-console';
import type * as PolicyModule from '../define';
import type * as WPData from '@wordpress/data';
import type * as WPHooks from '@wordpress/hooks';
import type { PolicyDeniedError } from '../../error/PolicyDeniedError';
import type { PolicyContext } from '../types';
import { WPK_SUBSYSTEM_NAMESPACES } from '../../namespace/constants';

type PolicyModuleType = typeof PolicyModule;

function loadPolicyModule(): PolicyModuleType {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require('../define') as PolicyModuleType;
}

function setWindowProp(key: string, value: unknown): void {
	Reflect.set(window as unknown as Record<string, unknown>, key, value);
}

function deleteWindowProp(key: string): void {
	Reflect.deleteProperty(window as unknown as Record<string, unknown>, key);
}

describe('policy environment edge cases', () => {
	const originalBroadcast = global.BroadcastChannel;
	const originalWp = (window as typeof window & { wp?: unknown }).wp;

	beforeEach(() => {
		jest.resetModules();
	});

	afterEach(() => {
		if (originalBroadcast) {
			global.BroadcastChannel = originalBroadcast;
		} else {
			delete (
				globalThis as { BroadcastChannel?: typeof BroadcastChannel }
			).BroadcastChannel;
		}

		if (originalWp === undefined) {
			deleteWindowProp('wp');
		} else {
			setWindowProp('wp', originalWp);
		}

		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('falls back when BroadcastChannel construction fails', () => {
		const broadcastError = new Error('channel-unavailable');
		const broadcastSpy = jest.fn(() => {
			throw broadcastError;
		});
		const warnSpy = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		(
			globalThis as { BroadcastChannel?: typeof BroadcastChannel }
		).BroadcastChannel = broadcastSpy as unknown as typeof BroadcastChannel;

		jest.isolateModules(() => {
			deleteWindowProp('wp');
			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{ 'tasks.manage': void }>({
				map: {
					'tasks.manage': () => false,
				},
			});

			expect(() => policy.assert('tasks.manage')).toThrow(
				'Policy "tasks.manage" denied.'
			);
		});

		expect(broadcastSpy).toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE}]`,
			'Failed to create BroadcastChannel for policy cache.',
			broadcastError
		);
		expect(console as any).toHaveWarned();
		expect(warnSpy).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY}]`,
			'Failed to create BroadcastChannel for policy events.',
			{ error: broadcastError }
		);
		expect(console as any).toHaveWarned();
		warnSpy.mockRestore();
	});

	it('logs WordPress adapter failures when canUser throws', () => {
		const warnSpy = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		jest.isolateModules(() => {
			const failure = new Error('wp-failed');
			const select = jest.fn(() => ({
				canUser: jest.fn(() => {
					throw failure;
				}),
			}));

			setWindowProp('wp', {
				data: {
					select,
				},
			});

			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{ 'tasks.wp': void }>({
				map: {
					'tasks.wp': ({ adapters }: PolicyContext) => {
						const allowed = adapters.wp?.canUser?.('read', {
							path: '/wp-json/acme',
						});
						expect(allowed).toBe(false);
						return false;
					},
				},
				options: {
					namespace: 'acme',
					debug: true,
				},
			});

			expect(() => policy.assert('tasks.wp')).toThrow(
				'Policy "tasks.wp" denied.'
			);

			const store = select.mock.results[0]?.value as
				| { canUser?: jest.Mock }
				| undefined;
			expect(store?.canUser).toHaveBeenCalledWith('read', {
				path: '/wp-json/acme',
			});

			expect(warnSpy).toHaveBeenCalledWith(
				'[acme]',
				'Failed to invoke wp.data.select("core").canUser',
				{
					error: failure,
				}
			);
			expect(console as any).toHaveWarned();
		});
		warnSpy.mockRestore();
	});

	it('raises a developer error when policy rules return non-boolean values', () => {
		jest.isolateModules(() => {
			const { definePolicy } = loadPolicyModule();
			const policy = definePolicy<{ 'tasks.invalid': void }>({
				map: {
					'tasks.invalid': () => 'nope' as unknown as boolean,
				},
			});

			expect(() => policy.can('tasks.invalid')).toThrow(
				'Policy "tasks.invalid" must return a boolean. Received string.'
			);
		});
	});

	it('ignores extended rules that are not functions', () => {
		jest.isolateModules(() => {
			const { definePolicy } = loadPolicyModule();
			const policy = definePolicy<{ 'tasks.manage': void }>({
				map: {
					'tasks.manage': () => true,
				},
			});

			policy.extend({
				// @ts-expect-error - coverage: non-function entries should be ignored
				'tasks.manage': null,
			});

			expect(policy.can('tasks.manage')).toBe(true);
		});
	});

	it('includes scalar and object params in denial context', () => {
		jest.isolateModules(() => {
			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{
				'tasks.scalar': string;
				'tasks.object': { reason: string };
			}>({
				map: {
					'tasks.scalar': () => false,
					'tasks.object': () => false,
				},
				options: { namespace: 'acme' },
			});

			try {
				policy.assert('tasks.scalar', 'blocked');
			} catch (error) {
				const denied = error as PolicyDeniedError;
				expect(denied.code).toBe('PolicyDenied');
				expect(denied.messageKey).toBe(
					'policy.denied.acme.tasks.scalar'
				);
				expect(denied.context).toEqual(
					expect.objectContaining({
						policyKey: 'tasks.scalar',
						value: 'blocked',
					})
				);
			}

			try {
				policy.assert('tasks.object', { reason: 'blocked' });
			} catch (error) {
				const denied = error as PolicyDeniedError;
				expect(denied.context).toEqual(
					expect.objectContaining({
						policyKey: 'tasks.object',
						reason: 'blocked',
					})
				);
			}
		});
	});

	it('uses no-op reporter methods when debug is disabled', () => {
		const infoSpy = jest
			.spyOn(console, 'info')
			.mockImplementation(() => undefined);
		const warnSpy = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const errorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const debugSpy = jest
			.spyOn(console, 'debug')
			.mockImplementation(() => undefined);

		jest.isolateModules(() => {
			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{ 'tasks.reporter': void }>({
				map: {
					'tasks.reporter': ({ reporter }: PolicyContext) => {
						reporter?.info('info');
						reporter?.warn('warn');
						reporter?.error('error');
						reporter?.debug?.('debug');
						return true;
					},
				},
			});

			expect(policy.can('tasks.reporter')).toBe(true);
		});

		expect(infoSpy).not.toHaveBeenCalled();
		expect(warnSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(debugSpy).not.toHaveBeenCalled();
		infoSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
		debugSpy.mockRestore();
	});

	it('emits reporter output when debug mode is enabled', () => {
		const infoSpy = jest
			.spyOn(console, 'info')
			.mockImplementation(() => undefined);
		const warnSpy = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const errorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const debugSpy = jest
			.spyOn(console, 'debug')
			.mockImplementation(() => undefined);

		jest.isolateModules(() => {
			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{ 'tasks.reporter': void }>({
				map: {
					'tasks.reporter': ({ reporter }: PolicyContext) => {
						reporter?.info('inform', { id: 1 });
						reporter?.warn('warn', { id: 2 });
						reporter?.error('error', { id: 3 });
						reporter?.debug?.('debug', { id: 4 });
						return true;
					},
				},
				options: { debug: true },
			});

			expect(policy.can('tasks.reporter')).toBe(true);
		});

		expect(infoSpy).toHaveBeenCalledWith('[wpk]', 'inform', {
			id: 1,
		});
		expect(warnSpy).toHaveBeenCalledWith('[wpk]', 'warn', {
			id: 2,
		});
		expect(errorSpy).toHaveBeenCalledWith('[wpk]', 'error', {
			id: 3,
		});
		expect(debugSpy).toHaveBeenCalledWith('[wpk]', 'debug', {
			id: 4,
		});
		infoSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
		debugSpy.mockRestore();
	});

	it('omits wp adapter when data.select is unavailable', () => {
		jest.isolateModules(() => {
			setWindowProp('wp', {
				data: {} as unknown as typeof WPData,
			});

			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{ 'tasks.wp': void }>({
				map: {
					'tasks.wp': ({ adapters }: PolicyContext) => {
						expect(adapters.wp).toBeUndefined();
						return true;
					},
				},
			});

			expect(policy.can('tasks.wp')).toBe(true);
		});
	});

	it('returns false when wp store lacks canUser', () => {
		jest.isolateModules(() => {
			const select = jest.fn(() => ({}));

			setWindowProp('wp', {
				data: {
					select,
				} as unknown as typeof WPData,
			});

			const { definePolicy } = loadPolicyModule();

			const policy = definePolicy<{ 'tasks.wp': void }>({
				map: {
					'tasks.wp': ({ adapters }: PolicyContext) => {
						const allowed = adapters.wp?.canUser?.('read', {
							path: '/wp-json',
						});
						expect(allowed).toBe(false);
						return true;
					},
				},
			});

			expect(policy.can('tasks.wp')).toBe(true);
			expect(select).toHaveBeenCalledWith('core');
		});
	});

	it('ignores WordPress hooks when doAction is unavailable', () => {
		jest.isolateModules(() => {
			setWindowProp('wp', {
				hooks: {} as unknown as typeof WPHooks,
			});

			const { definePolicy } = loadPolicyModule();
			const policy = definePolicy<{ 'tasks.deny': void }>({
				map: {
					'tasks.deny': () => false,
				},
			});

			expect(() => policy.assert('tasks.deny')).toThrow(
				'Policy "tasks.deny" denied.'
			);
		});
	});

	it('skips BroadcastChannel setup when unsupported', () => {
		const warnSpy = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		jest.isolateModules(() => {
			const testWindow = window as typeof window & {
				BroadcastChannel?: typeof BroadcastChannel;
			};
			const broadcastChannelBackup = testWindow.BroadcastChannel;
			Reflect.deleteProperty(testWindow, 'BroadcastChannel');

			try {
				const { definePolicy } = loadPolicyModule();
				const policy = definePolicy<{ 'tasks.deny': void }>({
					map: {
						'tasks.deny': () => false,
					},
				});

				expect(() => policy.assert('tasks.deny')).toThrow(
					'Policy "tasks.deny" denied.'
				);
			} finally {
				if (broadcastChannelBackup) {
					testWindow.BroadcastChannel = broadcastChannelBackup;
				} else {
					Reflect.deleteProperty(testWindow, 'BroadcastChannel');
				}
			}
		});

		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
