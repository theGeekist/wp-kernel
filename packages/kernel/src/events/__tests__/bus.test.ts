import {
        KernelEventBus,
        clearRegisteredActions,
        clearRegisteredResources,
        getRegisteredActions,
        getRegisteredResources,
        recordActionDefined,
        recordResourceDefined,
} from '../bus';

describe('KernelEventBus', () => {
        beforeEach(() => {
                clearRegisteredResources();
                clearRegisteredActions();
        });

        it('emits events to registered listeners', () => {
                const bus = new KernelEventBus();
                const listener = jest.fn();

                bus.on('custom:event', listener);
                bus.emit('custom:event', { eventName: 'example', payload: { foo: 'bar' } });

                expect(listener).toHaveBeenCalledWith({
                        eventName: 'example',
                        payload: { foo: 'bar' },
                });
        });

        it('records resource definitions for replay', () => {
                const resource = {
                        name: 'demo',
                        routes: {},
                } as unknown as Parameters<typeof recordResourceDefined>[0]['resource'];

                recordResourceDefined({ resource, namespace: 'tests' });

                expect(getRegisteredResources()).toEqual([
                        { resource, namespace: 'tests' },
                ]);

                clearRegisteredResources();
                expect(getRegisteredResources()).toHaveLength(0);
        });

        it('records action definitions for replay', () => {
                const action = jest.fn() as unknown as Parameters<
                        typeof recordActionDefined
                >[0]['action'];

                recordActionDefined({ action, namespace: 'tests' });

                expect(getRegisteredActions()).toEqual([
                        { action, namespace: 'tests' },
                ]);

                clearRegisteredActions();
                expect(getRegisteredActions()).toHaveLength(0);
        });
});
