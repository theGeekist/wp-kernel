# Actions API

> **Status**: 🚧 Auto-generated API docs coming in Sprint 1+

## `defineAction<P, R>(name, handler)`

Define an action that orchestrates writes, emits events, and manages cache.

### Type Parameters

- `P` - Parameters type
- `R` - Return type

### Parameters

- `name: string` - Action name in format `{Domain}.{Verb}` (e.g., `Thing.Create`)
- `handler: (params: P) => Promise<R>` - Async function that performs the action

### Returns

An action function with:

- `(params: P) => Promise<R>` - Call the action
- `.emit(event, payload)` - Emit canonical events
- `.name` - Action name

### Example

See [Quick Start](/getting-started/quick-start#step-3-write-an-action) for a complete example.
