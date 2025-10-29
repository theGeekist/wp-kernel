[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / KernelUITestHarness

# Interface: KernelUITestHarness

## Properties

### wordpress

```ts
wordpress: WordPressTestHarness;
```

---

### createRuntime()

```ts
createRuntime: (overrides?) => WPKernelUIRuntime;
```

#### Parameters

##### overrides?

`Partial`\&lt;[`WPKernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)\&gt;

#### Returns

[`WPKernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)

---

### createWrapper()

```ts
createWrapper: (runtime?) => (__namedParameters) => ReactElement<{}>;
```

#### Parameters

##### runtime?

[`WPKernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)

#### Returns

```ts
(__namedParameters): ReactElement<{
}>;
```

##### Parameters

###### \_\_namedParameters

###### children

`ReactNode`

##### Returns

`ReactElement`\&lt;\{
\}\&gt;

---

### resetActionStoreRegistration()

```ts
resetActionStoreRegistration: () => void;
```

#### Returns

`void`

---

### suppressConsoleError()

```ts
suppressConsoleError: (predicate) => void;
```

#### Parameters

##### predicate

(`args`) =&gt; `boolean`

#### Returns

`void`

---

### restoreConsoleError()

```ts
restoreConsoleError: () => void;
```

#### Returns

`void`

---

### teardown()

```ts
teardown: () => void;
```

#### Returns

`void`
