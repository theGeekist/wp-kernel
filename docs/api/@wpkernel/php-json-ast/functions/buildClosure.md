[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildClosure

# Function: buildClosure()

```ts
function buildClosure(options, attributes?): PhpExprClosure;
```

Builds a PHP closure expression node.

## Parameters

### options

Optional configuration for the closure (static, by reference, parameters, uses, return type, statements, attribute groups).

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

`Readonly`\<`Record`\<`string`, `unknown`\>\>

Optional attributes for the node.

## Returns

[`PhpExprClosure`](../interfaces/PhpExprClosure.md)

A `PhpExprClosure` node.
