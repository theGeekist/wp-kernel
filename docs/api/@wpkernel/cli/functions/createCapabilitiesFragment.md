[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / createCapabilitiesFragment

# Function: createCapabilitiesFragment()

```ts
function createCapabilitiesFragment(): IrFragment;
```

Creates an IR fragment that collects capability hints from resource definitions.

This fragment depends on the resources fragment to gather all defined capabilities
across the project, which are then used for generating capability maps.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for capability collection.
