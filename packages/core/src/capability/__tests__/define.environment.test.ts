import '@wordpress/jest-console';
import type * as CapabilityModule from '../define';
import type * as WPData from '@wordpress/data';
import type * as WPHooks from '@wordpress/hooks';
import type { CapabilityDeniedError } from '../../error/CapabilityDeniedError';
import type { CapabilityContext } from '../types';
import { WPK_SUBSYSTEM_NAMESPACES } from '../../contracts';

type CapabilityModuleType = typeof CapabilityModule;

function loadCapabilityModule(): CapabilityModuleType {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require('../define') as CapabilityModuleType;
}

function setWindowProp(key: string, value: unknown): void {
	Reflect.set(window as unknown as Record<string, unknown>, key, value);
}

function deleteWindowProp(key: string): void {
	Reflect.deleteProperty(window as unknown as Record<string, unknown>, key);
}

describe('capability environment edge cases', () => {
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
			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{ 'tasks.manage': void }>({
				map: {
					'tasks.manage': () => false,
				},
			});

			expect(() => capability.assert('tasks.manage')).toThrow(
				'Capability "tasks.manage" denied.'
			);
		});

		expect(broadcastSpy).toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE}]`,
			'Failed to create BroadcastChannel for capability cache.',
			broadcastError
		);
		expect(console as any).toHaveWarned();
		expect(warnSpy).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY}]`,
			'Failed to create BroadcastChannel for capability events.',
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

			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{ 'tasks.wp': void }>({
				map: {
					'tasks.wp': ({ adapters }: CapabilityContext) => {
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

			expect(() => capability.assert('tasks.wp')).toThrow(
				'Capability "tasks.wp" denied.'
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

	it('raises a developer error when capability rules return non-boolean values', () => {
		jest.isolateModules(() => {
			const { defineCapability } = loadCapabilityModule();
			const capability = defineCapability<{ 'tasks.invalid': void }>({
				map: {
					'tasks.invalid': () => 'nope' as unknown as boolean,
				},
			});

			expect(() => capability.can('tasks.invalid')).toThrow(
				'Capability "tasks.invalid" must return a boolean. Received string.'
			);
		});
	});

	it('ignores extended rules that are not functions', () => {
		jest.isolateModules(() => {
			const { defineCapability } = loadCapabilityModule();
			const capability = defineCapability<{ 'tasks.manage': void }>({
				map: {
					'tasks.manage': () => true,
				},
			});

			capability.extend({
				// @ts-expect-error - coverage: non-function entries should be ignored
				'tasks.manage': null,
			});

			expect(capability.can('tasks.manage')).toBe(true);
		});
	});

	it('includes scalar and object params in denial context', () => {
		jest.isolateModules(() => {
			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{
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
				capability.assert('tasks.scalar', 'blocked');
			} catch (error) {
				const denied = error as CapabilityDeniedError;
				expect(denied.code).toBe('CapabilityDenied');
				expect(denied.messageKey).toBe(
					'capability.denied.acme.tasks.scalar'
				);
				expect(denied.context).toEqual(
					expect.objectContaining({
						capabilityKey: 'tasks.scalar',
						value: 'blocked',
					})
				);
			}

			try {
				capability.assert('tasks.object', { reason: 'blocked' });
			} catch (error) {
				const denied = error as CapabilityDeniedError;
				expect(denied.context).toEqual(
					expect.objectContaining({
						capabilityKey: 'tasks.object',
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
			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{ 'tasks.reporter': void }>({
				map: {
					'tasks.reporter': ({ reporter }: CapabilityContext) => {
						reporter?.info('info');
						reporter?.warn('warn');
						reporter?.error('error');
						reporter?.debug?.('debug');
						return true;
					},
				},
			});

			expect(capability.can('tasks.reporter')).toBe(true);
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
			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{ 'tasks.reporter': void }>({
				map: {
					'tasks.reporter': ({ reporter }: CapabilityContext) => {
						reporter?.info('inform', { id: 1 });
						reporter?.warn('warn', { id: 2 });
						reporter?.error('error', { id: 3 });
						reporter?.debug?.('debug', { id: 4 });
						return true;
					},
				},
				options: { debug: true },
			});

			expect(capability.can('tasks.reporter')).toBe(true);
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

			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{ 'tasks.wp': void }>({
				map: {
					'tasks.wp': ({ adapters }: CapabilityContext) => {
						expect(adapters.wp).toBeUndefined();
						return true;
					},
				},
			});

			expect(capability.can('tasks.wp')).toBe(true);
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

			const { defineCapability } = loadCapabilityModule();

			const capability = defineCapability<{ 'tasks.wp': void }>({
				map: {
					'tasks.wp': ({ adapters }: CapabilityContext) => {
						const allowed = adapters.wp?.canUser?.('read', {
							path: '/wp-json',
						});
						expect(allowed).toBe(false);
						return true;
					},
				},
			});

			expect(capability.can('tasks.wp')).toBe(true);
			expect(select).toHaveBeenCalledWith('core');
		});
	});

	it('ignores WordPress hooks when doAction is unavailable', () => {
		jest.isolateModules(() => {
			setWindowProp('wp', {
				hooks: {} as unknown as typeof WPHooks,
			});

			const { defineCapability } = loadCapabilityModule();
			const capability = defineCapability<{ 'tasks.deny': void }>({
				map: {
					'tasks.deny': () => false,
				},
			});

			expect(() => capability.assert('tasks.deny')).toThrow(
				'Capability "tasks.deny" denied.'
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
				const { defineCapability } = loadCapabilityModule();
				const capability = defineCapability<{ 'tasks.deny': void }>({
					map: {
						'tasks.deny': () => false,
					},
				});

				expect(() => capability.assert('tasks.deny')).toThrow(
					'Capability "tasks.deny" denied.'
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
