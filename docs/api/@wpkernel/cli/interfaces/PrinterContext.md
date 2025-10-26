[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / PrinterContext

# Interface: PrinterContext

## Properties

### ir

```ts
ir: IRv1;
```

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

Absolute path to the directory containing the active kernel config.
When omitted the printers fall back to the directory inferred from
the IR metadata source path relative to the current working directory.

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

### writeFile()

```ts
writeFile: (filePath, contents) => Promise<void>;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### ensureDirectory()

```ts
ensureDirectory: (directoryPath) => Promise<void>;
```

#### Parameters

##### directoryPath

`string`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### phpAdapter?

```ts
optional phpAdapter: PhpAdapterConfig;
```

---

### adapterContext?

```ts
optional adapterContext: AdapterContext & object;
```

#### Type Declaration

##### ir

```ts
ir: IRv1;
```
