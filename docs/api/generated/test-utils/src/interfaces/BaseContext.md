[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / BaseContext

# Interface: BaseContext

## Indexable

```ts
[key: string]: unknown
```

## Properties

### stdout

```ts
stdout: MemoryStream;
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

### env

```ts
env: ProcessEnv;
```

---

### cwd()

```ts
cwd: () => string;
```

#### Returns

`string`

---

### colorDepth

```ts
colorDepth: number;
```
