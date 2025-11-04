[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ReporterLike

# Type Alias: ReporterLike

```ts
type ReporterLike = Pick & lt;
(Reporter, 'info' | 'debug' | 'warn' | 'error' | ('child' & gt));
```

A subset of the Reporter interface, focusing on logging methods.
