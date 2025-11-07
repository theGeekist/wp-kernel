# Core for Plugin Developers

The core package is the contract layer that keeps WordPress data, custom REST endpoints, and UI bindings in sync. Plugin developers use it to declare resources, orchestrate actions, and expose interactivity to the block editor without writing glue code twice.

## Install the runtime

Add `@wpkernel/core` to your plugin workspace and ensure the WordPress environment loads the compiled bundle. The package expects WordPress 6.7 or later so that the Script Modules API is available.

When the plugin boots, register your primary data store and initialise the kernel.

```ts
import { configureWPKernel, registerWPKernelStore } from '@wpkernel/core/data';
import { createStore } from '@wpkernel/core/resource';

const store = registerWPKernelStore('acme/support', createStore(storeConfig));
const wpk = configureWPKernel({
	namespace: 'acme-support',
	registry: store.registry,
	ui: { enable: true },
});
```

## Declare resources first

Resources define REST routes, cache behaviour, and store metadata in one place. Create them before building actions so the generated cache helpers are available everywhere.

```ts
import { defineResource } from '@wpkernel/core/resource';

export const ticketResource = defineResource({
	name: 'acme-support:ticket',
	routes: ({ rest }) => ({
		list: rest.getList('/acme-support/v1/tickets'),
		get: rest.getItem('/acme-support/v1/tickets/:id'),
		update: rest.update('/acme-support/v1/tickets/:id'),
	}),
});
```

Use the cache helpers to keep selectors fresh when a mutation succeeds.

```ts
import { invalidate } from '@wpkernel/core/resource';

await ticketResource.update({ id: ticketId, status: 'resolved' });
invalidate(['ticket', 'list']);
```

## Orchestrate work with actions

Actions wrap business logic and emit lifecycle events automatically. They are also the enforcement point for capability checks and telemetry.

```ts
import { defineAction } from '@wpkernel/core/actions';
import { createActionMiddleware, invokeAction } from '@wpkernel/core/actions';

export const ResolveTicket = defineAction({
	name: 'Support.ResolveTicket',
	handler: async (ctx, { id }) => {
		ctx.capability.assert('support.resolve');
		const ticket = await ticketResource.update({ id, status: 'resolved' });
		ctx.invalidate(['ticket', 'list']);
		ctx.reporter.info('Support ticket resolved', { id });
		return ticket;
	},
});
```

Wire the middleware into your WordPress data store so UI components can dispatch actions with `invokeAction`.

```ts
const middleware = createActionMiddleware();
const envelope = invokeAction(ResolveTicket, { id: ticketId });
await wp.data.dispatch('acme/support').dispatch(envelope);
```

## Bind UI with interactivity modules

Use `defineInteraction` to connect server state, resources, and actions to Script Module components. The helper registers a store namespace and synchronises server-rendered state back into the resource cache.

```ts
import { defineInteraction } from '@wpkernel/core/interactivity';
import { ticketResource } from './ticket-resource';
import { ResolveTicket } from './actions/ResolveTicket';

export const TicketList = defineInteraction({
	resource: ticketResource,
	feature: 'tickets',
	actions: { resolve: ResolveTicket },
});
```

## Diagnose and ship

The wpk reporter surfaces transport, cache, and action metadata. Pass your own reporter instance into `configureWPKernel` to pipe diagnostics to the WordPress notices system or external observability tools.

Remember to document any new public behaviour alongside the [core contributor guide](./framework-contributors.md) so maintainers can keep the runtime aligned across packages.
