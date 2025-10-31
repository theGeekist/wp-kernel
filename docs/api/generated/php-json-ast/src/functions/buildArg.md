[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildArg

# Function: buildArg()

```ts
function buildArg(value, options, attributes?): PhpArg;
```

## Parameters

### value

[`PhpExpr`](../type-aliases/PhpExpr.md)

### options

#### byRef?

`boolean`

#### unpack?

`boolean`

#### name?

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) \| `null`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpArg`](../interfaces/PhpArg.md)
