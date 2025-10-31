[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / BaseContext

# Interface: BaseContext

## Indexable

```ts
[key: string]: unknown
```

## Properties

### colorDepth

```ts
colorDepth: number;
```

---

### cwd()

```ts
cwd: () => string;
```

#### Returns

`string`

---

### env

```ts
env: ProcessEnv;
```

---

### stderr

```ts
stderr: MemoryStream;
```

---

### stdin

```ts
stdin: ReadStream;
```

---

### stdout

```ts
stdout: MemoryStream;
```
