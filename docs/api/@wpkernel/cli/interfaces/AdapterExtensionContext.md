[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / AdapterExtensionContext

# Interface: AdapterExtensionContext

Execution context provided to adapter extensions.

## Extends

- [`AdapterContext`](AdapterContext.md)

## Properties

### config

```ts
config: KernelConfigV1;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`config`](AdapterContext.md#config)

---

### reporter

```ts
reporter: Reporter;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`reporter`](AdapterContext.md#reporter)

---

### namespace

```ts
namespace: string;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`namespace`](AdapterContext.md#namespace)

---

### ir

```ts
ir: IRv1;
```

#### Overrides

[`AdapterContext`](AdapterContext.md).[`ir`](AdapterContext.md#ir)

---

### outputDir

```ts
outputDir: string;
```

---

### configDirectory?

```ts
optional configDirectory: string;
```

---

### tempDir

```ts
tempDir: string;
```

---

### queueFile()

```ts
queueFile: (filePath, contents) => Promise<void>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### updateIr()

```ts
updateIr: (nextIr) => void;
```

#### Parameters

##### nextIr

[`IRv1`](IRv1.md)

#### Returns

`void`

---

### formatPhp()

```ts
formatPhp: (filePath, contents) => Promise<string>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`\&lt;`string`\&gt;

---

### formatTs()

```ts
formatTs: (filePath, contents) => Promise<string>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`\&lt;`string`\&gt;
