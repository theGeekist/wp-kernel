[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / IRPolicyMap

# Interface: IRPolicyMap

## Properties

### sourcePath?

```ts
optional sourcePath: string;
```

---

### definitions

```ts
definitions: IRPolicyDefinition[];
```

---

### fallback

```ts
fallback: object;
```

#### capability

```ts
capability: string;
```

#### appliesTo

```ts
appliesTo: IRPolicyScope;
```

---

### missing

```ts
missing: string[];
```

---

### unused

```ts
unused: string[];
```

---

### warnings

```ts
warnings: IRWarning[];
```
