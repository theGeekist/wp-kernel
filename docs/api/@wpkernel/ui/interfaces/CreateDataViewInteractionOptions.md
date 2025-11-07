[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / CreateDataViewInteractionOptions

# Interface: CreateDataViewInteractionOptions\<TItem, TQuery, TActions\>

Configuration required to bridge a DataView controller into the interactivity runtime.

Provide either an explicit controller instance or the resource metadata so the helper
can resolve the registered controller automatically.

## Type Parameters

### TItem

`TItem`

The resource record type handled by the DataView controller.

### TQuery

`TQuery`

The query payload shape produced by the DataView controller.

### TActions

`TActions` _extends_ `InteractionActionsRecord` \| `undefined` = `InteractionActionsRecord`

Optional interactivity actions map to augment the interaction.

## Properties

### runtime

```ts
runtime: DataViewsRuntimeContext;
```

Runtime context containing the registered controllers and reporter hooks.

---

### feature

```ts
feature: string;
```

Namespaced identifier used to scope the interaction within the interactivity
runtime. Typically matches the UI feature slug.

---

### controller?

```ts
optional controller: ResourceDataViewController<TItem, TQuery>;
```

Optional controller instance. When omitted, the helper resolves the
controller from the runtime registry using [resourceName](#resourcename).

---

### resource?

```ts
optional resource: ResourceObject<TItem, TQuery>;
```

Optional resource reference that will be passed through to
defineInteraction. Provide it when the controller does not embed the
resource definition.

---

### resourceName?

```ts
optional resourceName: string;
```

Resource identifier used to look up the controller from the runtime when
[controller](#controller) is not provided.

---

### store?

```ts
optional store: Record<string, unknown>;
```

Optional store object that will be extended with the DataView state before
being provided to defineInteraction.

---

### actions?

```ts
optional actions: TActions;
```

Additional interactivity actions exposed alongside the default resource
actions.

---

### registry?

```ts
optional registry: WPKernelRegistry;
```

Custom registry implementation to use for dispatch and selectors. Defaults
to the registry registered with the runtime.

---

### namespace?

```ts
optional namespace: string;
```

Optional namespace override that will be forwarded to
defineInteraction. Defaults to the runtime namespace.

---

### autoHydrate?

```ts
optional autoHydrate: boolean;
```

When true, hydrates cached state from the server automatically using the
controller schema.

---

### hydrateServerState()?

```ts
optional hydrateServerState: (input) => void;
```

Custom server-state hydration handler invoked when [autoHydrate](#autohydrate) is
enabled.

#### Parameters

##### input

`HydrateServerStateInput`\<`TItem`, `TQuery`\>

#### Returns

`void`
