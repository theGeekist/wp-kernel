[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildClosure

# Function: buildClosure()

```ts
function buildClosure(options, attributes?): PhpExprClosure;
```

## Parameters

### options

#### static?

`boolean`

#### byRef?

`boolean`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### uses?

[`PhpClosureUse`](../interfaces/PhpClosureUse.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprClosure`](../interfaces/PhpExprClosure.md)
