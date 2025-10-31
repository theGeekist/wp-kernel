[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / InteractionActionsRuntime

# Type Alias: InteractionActionsRuntime\&lt;TActions\&gt;

```ts
type InteractionActionsRuntime<TActions> = {
	[Key in keyof TActions]: TActions[Key] extends InteractionActionInput<
		infer TArgs,
		infer TResult
	>
		? (args: TArgs) => Promise<TResult>
		: never;
};
```

Runtime representation of bound interaction actions.

## Type Parameters

### TActions

`TActions` _extends_ [`InteractionActionsRecord`](InteractionActionsRecord.md)
