[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / AdapterExtensionContext

# Interface: AdapterExtensionContext

Execution context provided to adapter extensions.

## Extends

- [`AdapterContext`](AdapterContext.md)

## Properties

### config

```ts
config: WPKernelConfigV1;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`config`](AdapterContext.md#config)

---

### configDirectory?

```ts
optional configDirectory: string;
```

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

---

### ir

```ts
ir: IRv1;
```

#### Overrides

[`AdapterContext`](AdapterContext.md).[`ir`](AdapterContext.md#ir)

---

### namespace

```ts
namespace: string;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`namespace`](AdapterContext.md#namespace)

---

### outputDir

```ts
outputDir: string;
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

### reporter

```ts
reporter: Reporter;
```

#### Inherited from

[`AdapterContext`](AdapterContext.md).[`reporter`](AdapterContext.md#reporter)

---

### tempDir

```ts
tempDir: string;
```

---

### updateIr()

```ts
updateIr: (ir) => void;
```

#### Parameters

##### ir

[`IRv1`](IRv1.md)

#### Returns

`void`
