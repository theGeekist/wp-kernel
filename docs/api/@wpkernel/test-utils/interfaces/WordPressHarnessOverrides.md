[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WordPressHarnessOverrides

# Interface: WordPressHarnessOverrides

Overrides for the WordPress test harness.

## Properties

### data?

```ts
optional data: Partial&lt;WordPressData&gt;;
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
optional hooks: Partial&lt;any&gt;;
```

Partial overrides for `window.wp.hooks`.
