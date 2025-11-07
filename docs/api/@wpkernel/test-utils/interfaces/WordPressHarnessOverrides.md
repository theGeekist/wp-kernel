[**@wpkernel/test-utils v0.12.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WordPressHarnessOverrides

# Interface: WordPressHarnessOverrides

Overrides for the WordPress test harness.

## Properties

### data?

```ts
optional data: Partial<WordPressData>;
```

Partial overrides for `window.wp.data`.

---

### apiFetch?

```ts
optional apiFetch: any;
```

A mock `apiFetch` function.

---

### hooks?

```ts
optional hooks: Partial<any>;
```

Partial overrides for `window.wp.hooks`.
