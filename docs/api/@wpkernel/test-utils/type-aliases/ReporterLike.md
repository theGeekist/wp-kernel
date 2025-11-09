[**@wpkernel/test-utils v0.12.1-beta.2**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ReporterLike

# Type Alias: ReporterLike

```ts
type ReporterLike = Pick<
	Reporter,
	'info' | 'debug' | 'warn' | 'error' | 'child'
>;
```

A subset of the Reporter interface, focusing on logging methods.
