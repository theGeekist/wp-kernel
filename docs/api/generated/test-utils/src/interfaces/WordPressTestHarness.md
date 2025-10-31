[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / WordPressTestHarness

# Interface: WordPressTestHarness

## Properties

### data

```ts
data: WordPressData;
```

Convenience access to the shared data package to avoid calling
`ensureWpData()` repeatedly in suites.

---

### reset()

```ts
reset: () => void;
```

Reset namespace state and clear all jest mocks.

#### Returns

`void`

---

### teardown()

```ts
teardown: () => void;
```

Restore the previous global and perform a reset.

#### Returns

`void`

---

### wp

```ts
wp: object;
```

The mock WordPress global that has been installed.

#### apiFetch?

```ts
optional apiFetch: __module;
```

#### data?

```ts
optional data: __module;
```

#### hooks?

```ts
optional hooks: __module;
```

#### interactivity?

```ts
optional interactivity: __module;
```
