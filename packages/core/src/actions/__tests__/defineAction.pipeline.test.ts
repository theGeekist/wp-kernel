import { defineAction } from '../define';
import { WPKernelError } from '../../error/WPKernelError';
import * as pipelineModule from '../../pipeline/actions/createActionPipeline';
import * as events from '../../events/bus';
import type { ActionDefinedEvent } from '../../events/bus';

type WindowWithHooks = Window & { wp?: { hooks?: { doAction: jest.Mock } } };

describe('defineAction pipeline integration', () => {
	let doAction: jest.Mock;
	let originalRuntime: typeof global.__WP_KERNEL_ACTION_RUNTIME__;
	let originalWp: WindowWithHooks['wp'];

	beforeEach(() => {
		originalRuntime = global.__WP_KERNEL_ACTION_RUNTIME__;
		doAction = jest.fn();
		const windowWithWp = window as WindowWithHooks;
		originalWp = windowWithWp.wp;
		(window as unknown as { wp?: unknown }).wp = {
			...(originalWp ?? {}),
			hooks: { doAction } as unknown,
		};
	});

	afterEach(() => {
		global.__WP_KERNEL_ACTION_RUNTIME__ = originalRuntime;
		(window as unknown as { wp?: unknown }).wp = originalWp;
	});

	it('executes actions through the pipeline and emits lifecycle events', async () => {
		const pipelineSpy = jest.spyOn(pipelineModule, 'createActionPipeline');
		const action = defineAction({
			name: 'Pipeline.Test',
			handler: async (_ctx, args: { value: number }) => ({
				doubled: args.value * 2,
			}),
		});

		expect(pipelineSpy).toHaveBeenCalledTimes(1);

		const result = await action({ value: 5 });

		expect(result).toEqual({ doubled: 10 });
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Pipeline.Test' })
		);
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({ actionName: 'Pipeline.Test' })
		);

		expect(pipelineSpy).toHaveBeenCalled();
		pipelineSpy.mockRestore();
	});

	it('records action definitions exactly once via the registry bridge', async () => {
		const recordSpy = jest.spyOn(events, 'recordActionDefined');
		const bus = events.getWPKernelEventBus();
		const emitSpy = jest.spyOn(bus, 'emit');

		const action = defineAction({
			name: 'Pipeline.Registry',
			handler: async () => undefined,
		});

		expect(recordSpy).toHaveBeenCalledTimes(1);
		const definedPayload = emitSpy.mock.calls.find(
			([eventName]) => eventName === 'action:defined'
		)?.[1] as ActionDefinedEvent | undefined;

		expect(definedPayload).toBeDefined();
		expect(definedPayload?.action).toBe(action);

		await action(undefined as never);
		await action(undefined as never);

		expect(recordSpy).toHaveBeenCalledTimes(1);

		emitSpy.mockRestore();
		recordSpy.mockRestore();
	});

	it('normalises errors via the pipeline', async () => {
		const pipelineSpy = jest.spyOn(pipelineModule, 'createActionPipeline');
		const action = defineAction({
			name: 'Pipeline.Fail',
			handler: async () => {
				throw new Error('boom');
			},
		});

		await expect(action(undefined as never)).rejects.toBeInstanceOf(
			WPKernelError
		);

		expect(pipelineSpy).toHaveBeenCalled();
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({ actionName: 'Pipeline.Fail' })
		);

		pipelineSpy.mockRestore();
	});
});
