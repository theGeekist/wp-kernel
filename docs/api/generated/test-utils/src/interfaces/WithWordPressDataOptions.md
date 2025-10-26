[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / WithWordPressDataOptions

# Interface: WithWordPressDataOptions

## Properties

### wp?

```ts
optional wp:
  | {
  data?: __module;
  apiFetch?: __module;
  hooks?: __module;
}
  | null;
```

---

### data?

```ts
optional data: Partial<WordPressData> | null;
```

---

### hooks?

```ts
optional hooks: Partial<__module | undefined> | null;
```

---

### apiFetch?

```ts
optional apiFetch: any;
```
