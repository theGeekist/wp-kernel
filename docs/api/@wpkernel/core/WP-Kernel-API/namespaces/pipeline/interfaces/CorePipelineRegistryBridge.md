[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / CorePipelineRegistryBridge

# Interface: CorePipelineRegistryBridge

Shared registry hooks surfaced to pipeline helpers.

## Properties

### recordActionDefined()?

```ts
readonly optional recordActionDefined: (event) =&gt; void;
```

Record an action definition once helper orchestration completes.

#### Parameters

##### event

[`ActionDefinedEvent`](../../../../type-aliases/ActionDefinedEvent.md)

#### Returns

`void`

***

### recordResourceDefined()?

```ts
readonly optional recordResourceDefined: (event) =&gt; void;
```

Record a resource definition once helper orchestration completes.

#### Parameters

##### event

[`ResourceDefinedEvent`](../../../../type-aliases/ResourceDefinedEvent.md)

#### Returns

`void`
