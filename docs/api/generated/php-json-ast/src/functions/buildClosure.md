[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildClosure

# Function: buildClosure()

```ts
function buildClosure(options, attributes?): PhpExprClosure;
```

## Parameters

### options

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### static?

`boolean`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

#### uses?

[`PhpClosureUse`](../interfaces/PhpClosureUse.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprClosure`](../interfaces/PhpExprClosure.md)
