[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / ApiFetchHarnessOptions

# Interface: ApiFetchHarnessOptions

Options for creating an `ApiFetchHarness`.

## Properties

### data?

```ts
optional data: Partial&lt;WordPressData&gt;;
```

Partial overrides for `window.wp.data`.

***

### hooks?

```ts
optional hooks: Partial&lt;any&gt;;
```

Partial overrides for `window.wp.hooks`.

***

### apiFetch?

```ts
optional apiFetch: any;
```

A mock `apiFetch` function.
