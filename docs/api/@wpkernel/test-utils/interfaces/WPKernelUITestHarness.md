[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / WPKernelUITestHarness

# Interface: WPKernelUITestHarness

A harness for testing UI components that interact with the WPKernel UI runtime.

## Properties

### wordpress

```ts
wordpress: WordPressTestHarness;
```

The WordPress test harness.

***

### createRuntime()

```ts
createRuntime: (overrides?) =&gt; WPKernelUIRuntime;
```

Creates a new `WPKernelUIRuntime` instance.

#### Parameters

##### overrides?

`Partial`\&lt;`WPKernelUIRuntime`\&gt;

#### Returns

`WPKernelUIRuntime`

***

### createWrapper()

```ts
createWrapper: (runtime?) =&gt; (__namedParameters) =&gt; ReactElement&lt;{
}&gt;;
```

Creates a React wrapper component for the WPKernel UI runtime.

#### Parameters

##### runtime?

`WPKernelUIRuntime`

#### Returns

```ts
(__namedParameters): ReactElement&lt;{
}&gt;;
```

##### Parameters

###### \_\_namedParameters

###### children

`ReactNode`

##### Returns

`ReactElement`\&lt;\{
\}\&gt;

***

### resetActionStoreRegistration()

```ts
resetActionStoreRegistration: () =&gt; void;
```

Resets the action store registration.

#### Returns

`void`

***

### suppressConsoleError()

```ts
suppressConsoleError: (predicate) =&gt; void;
```

Suppresses console errors that match a given predicate.

#### Parameters

##### predicate

(`args`) =&gt; `boolean`

#### Returns

`void`

***

### restoreConsoleError()

```ts
restoreConsoleError: () =&gt; void;
```

Restores the original console error function.

#### Returns

`void`

***

### teardown()

```ts
teardown: () =&gt; void;
```

Tears down the harness, restoring original globals.

#### Returns

`void`
