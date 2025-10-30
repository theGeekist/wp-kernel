[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / WordPressTestHarness

# Interface: WordPressTestHarness

## Properties

### wp

```ts
wp: object;
```

The mock WordPress global that has been installed.

#### data?

```ts
optional data: __module;
```

#### apiFetch?

```ts
optional apiFetch: __module;
```

#### hooks?

```ts
optional hooks: __module;
```

#### interactivity?

```ts
optional interactivity: __module;
```

---

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
