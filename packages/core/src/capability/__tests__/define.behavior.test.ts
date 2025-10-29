import { type CapabilityDeniedError } from '../../error/CapabilityDeniedError';
import { withCapabilityRequestContext } from '../context';
import type { ActionRuntime } from '../../actions/types';
import type {
	CapabilityHelpers,
	CapabilityMap,
	CapabilityOptions,
} from '../types';
import { WPK_SUBSYSTEM_NAMESPACES } from '../../contracts';

type DefineCapability = <K extends Record<string, unknown>>(
	map: CapabilityMap<K>,
	options?: CapabilityOptions
) => CapabilityHelpers<K>;

async function loadDefineCapability(): Promise<DefineCapability> {
	jest.resetModules();
	const module = await import('../define');
	return <K extends Record<string, unknown>>(
		map: CapabilityMap<K>,
		options?: CapabilityOptions
	) => module.defineCapability<K>({ map, options });
}

describe('defineCapability behaviour', () => {
	const originalBroadcastChannel = window.BroadcastChannel;

	beforeEach(() => {
		delete global.__WP_KERNEL_ACTION_RUNTIME__;
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: originalBroadcastChannel,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(() => {
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: originalBroadcastChannel,
		});
	});

	it('uses WordPress canUser fallback when adapters are not provided', async () => {
		const canUser = jest.fn(() => true);
		const select = window.wp?.data?.select as jest.Mock | undefined;
		expect(select).toBeDefined();
		select!.mockImplementation(() => ({ canUser }));

		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{
			'content.read': { path: string };
		}>({
			'content.read': (context, resource) =>
				context.adapters.wp?.canUser?.('read', resource) ?? false,
		});

		const outcome = capability.can('content.read', { path: '/api' });
		if (outcome instanceof Promise) {
			await expect(outcome).resolves.toBe(true);
		} else {
			expect(outcome).toBe(true);
		}
		expect(select).toHaveBeenCalledWith('core');
		expect(canUser).toHaveBeenCalledWith('read', { path: '/api' });
		select!.mockReset();
	});

	it('warns when WordPress canUser invocation fails', async () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const select = window.wp?.data?.select as jest.Mock | undefined;
		expect(select).toBeDefined();
		select!.mockImplementation(() => {
			throw new Error('select failed');
		});

		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{
			'content.read': { path: string };
		}>(
			{
				'content.read': (context, resource) =>
					context.adapters.wp?.canUser?.('read', resource) ?? false,
			},
			{ debug: true }
		);

		const outcome = capability.can('content.read', { path: '/api' });
		if (outcome instanceof Promise) {
			await expect(outcome).resolves.toBe(false);
		} else {
			expect(outcome).toBe(false);
		}
		expect(warn).toHaveBeenCalledWith(
			'[wpk]',
			'Failed to invoke wp.data.select("core").canUser',
			expect.objectContaining({ error: expect.any(Error) })
		);
		expect(console as any).toHaveWarned();
		select!.mockReset();
	});

	it('falls back to false when WordPress canUser is unavailable', async () => {
		const select = window.wp?.data?.select as jest.Mock | undefined;
		expect(select).toBeDefined();

		select!.mockImplementation(() => ({}));
		try {
			const defineCapability = await loadDefineCapability();
			const capability = defineCapability<{
				'content.read': { path: string };
			}>({
				'content.read': (context, resource) =>
					context.adapters.wp?.canUser?.('read', resource) ?? false,
			});

			const outcome = capability.can('content.read', { path: '/api' });
			if (outcome instanceof Promise) {
				await expect(outcome).resolves.toBe(false);
				return;
			}
			expect(outcome).toBe(false);
		} finally {
			select!.mockReset();
		}
	});

	it('enforces boolean return values from rules', async () => {
		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{ 'content.read': void }>({
			'content.read': () => 'yes' as unknown as boolean,
		});

		expect(() => capability.can('content.read')).toThrow(
			'Capability "content.read" must return a boolean. Received string.'
		);
	});

	it('emits denial events for async assertions', async () => {
		const doAction = window.wp?.hooks?.doAction as jest.Mock | undefined;
		expect(doAction).toBeDefined();

		class CapturingChannel {
			public static instance: CapturingChannel | undefined;
			public messages: unknown[] = [];
			public onmessage: ((event: MessageEvent) => void) | null = null;

			public constructor(public name: string) {
				CapturingChannel.instance = this;
			}

			public postMessage(message: unknown) {
				this.messages.push(message);
			}

			public close() {}
		}

		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: CapturingChannel,
		});

		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{ 'content.delete': void }>({
			'content.delete': async () => false,
		});

		await expect(capability.assert('content.delete')).rejects.toMatchObject(
			{
				code: 'CapabilityDenied',
			}
		);
		expect(doAction).toHaveBeenCalledWith(
			'wpk.capability.denied',
			expect.objectContaining({ capabilityKey: 'content.delete' })
		);
		expect(CapturingChannel.instance?.messages[0]).toEqual(
			expect.objectContaining({
				type: 'capability.denied',
				namespace: 'wpk',
			})
		);
	});

	it('skips WordPress hook emission when hooks are unavailable', async () => {
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		const originalDoAction = hooks?.doAction;
		if (hooks) {
			delete hooks.doAction;
		}

		try {
			const defineCapability = await loadDefineCapability();
			const capability = defineCapability<{ deny: void }>({
				deny: () => false,
			});

			try {
				capability.assert('deny');
				throw new Error('expected capability assertion to throw');
			} catch (error) {
				expect((error as { code?: string }).code).toBe(
					'CapabilityDenied'
				);
			}
		} finally {
			if (hooks) {
				hooks.doAction =
					originalDoAction ?? (jest.fn() as unknown as jest.Mock);
			}
		}
	});

	it('registers helpers on existing action runtime', async () => {
		const runtime: ActionRuntime = { capability: {} };
		global.__WP_KERNEL_ACTION_RUNTIME__ = runtime;

		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{ 'content.read': void }>({
			'content.read': () => true,
		});

		expect(global.__WP_KERNEL_ACTION_RUNTIME__).toBe(runtime);
		expect(
			global.__WP_KERNEL_ACTION_RUNTIME__?.capability?.can
		).toBeDefined();
		const outcome = capability.can('content.read');
		if (outcome instanceof Promise) {
			await expect(outcome).resolves.toBe(true);
		} else {
			expect(outcome).toBe(true);
		}
	});

	it('builds denial context with request data and params', async () => {
		expect.assertions(2);
		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{
			'content.update': { reason: string };
		}>(
			{
				'content.update': () => false,
			},
			{ namespace: 'acme' }
		);

		try {
			withCapabilityRequestContext(
				{
					actionName: 'Action.Update',
					requestId: 'req-123',
					namespace: 'acme',
					scope: 'crossTab',
					bridged: false,
				},
				() => capability.assert('content.update', { reason: 'missing' })
			);
		} catch (error) {
			const err = error as CapabilityDeniedError;
			expect(err.messageKey).toBe(
				'capability.denied.acme.content.update'
			);
			expect(err.context).toEqual(
				expect.objectContaining({
					capabilityKey: 'content.update',
					reason: 'missing',
				})
			);
		}
	});

	it('logs BroadcastChannel creation failures', async () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: jest.fn(() => {
				throw new Error('channel failed');
			}),
		});

		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{ deny: void }>({
			deny: () => false,
		});

		try {
			capability.assert('deny');
			throw new Error('expected capability assertion to throw');
		} catch (error) {
			expect((error as { code?: string }).code).toBe('CapabilityDenied');
		}
		expect(warn).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY}]`,
			'Failed to create BroadcastChannel for capability events.',
			{ error: expect.any(Error) }
		);
		expect(console as any).toHaveWarned();
	});

	it('warns when extending an existing capability key', async () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		const defineCapability = await loadDefineCapability();
		const capability = defineCapability<{ allow: void }>({
			allow: () => true,
		});

		capability.extend({ allow: () => false });
		expect(warn).toHaveBeenCalledWith(
			`[${WPK_SUBSYSTEM_NAMESPACES.POLICY}]`,
			'Capability "allow" is being overridden via extend().',
			{ capabilityKey: 'allow' }
		);
		expect(console as any).toHaveWarned();
	});
});
