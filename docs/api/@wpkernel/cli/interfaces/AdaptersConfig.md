[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / AdaptersConfig

# Interface: AdaptersConfig

Optional adapters configured by a wpk project.

## Properties

### extensions?

```ts
optional extensions: AdapterExtensionFactory[];
```

Adapter extension factories that run during generation to patch or extend
the default adapters.

---

### php?

```ts
optional php: PhpAdapterFactory;
```

Factory that returns PHP codegen overrides (for example, changing
namespaces or adding extra includes). Most plugins do not need this.
