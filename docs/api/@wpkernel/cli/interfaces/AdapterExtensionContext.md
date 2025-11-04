[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / AdapterExtensionContext

# Interface: AdapterExtensionContext

Execution context provided to adapter extensions.

## Extends

- [`AdapterContext`](AdapterContext.md)

## Properties

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

### tempDir

```ts
tempDir: string;
```

---

### queueFile()

```ts
queueFile: (filePath, contents) =&gt; Promise&lt;void&gt;;
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
updateIr: (ir) =&gt; void;
```

#### Parameters

##### ir

[`IRv1`](IRv1.md)

#### Returns

`void`

---

### formatPhp()

```ts
formatPhp: (filePath, contents) =&gt; Promise&lt;string&gt;;
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
formatTs: (filePath, contents) =&gt; Promise&lt;string&gt;;
```

#### Parameters

##### filePath

`string`

##### contents

`string`

#### Returns

`Promise`\&lt;`string`\&gt;

---

### config

```ts
config: WPKernelConfigV1;
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

### configDirectory?

```ts
optional configDirectory: string;
```
