[**WP Kernel API v0.7.0**](../../../README.md)

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
createRuntime: (overrides?) => KernelUIRuntime;
```

#### Parameters

##### overrides?

`Partial`\&lt;[`KernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/KernelUIRuntime.md)\&gt;

#### Returns

[`KernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/KernelUIRuntime.md)

---

### createWrapper()

```ts
createWrapper: (runtime?) => (__namedParameters) => ReactElement<{}>;
```

#### Parameters

##### runtime?

[`KernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/KernelUIRuntime.md)

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
