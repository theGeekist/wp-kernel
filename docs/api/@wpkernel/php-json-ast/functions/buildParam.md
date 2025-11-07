[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildParam

# Function: buildParam()

```ts
function buildParam(variable, options, attributes?): PhpParam;
```

Builds a PHP parameter node.

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

The variable expression for the parameter.

### options

Optional configuration for the parameter (type, by reference, variadic, default value, flags, attribute groups, hooks).

#### type?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### byRef?

`boolean`

#### variadic?

`boolean`

#### default?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### flags?

`number`

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### hooks?

[`PhpPropertyHook`](../interfaces/PhpPropertyHook.md)[]

### attributes?

`Readonly`\<`Record`\<`string`, `unknown`\>\>

Optional attributes for the node.

## Returns

[`PhpParam`](../interfaces/PhpParam.md)

A `PhpParam` node.
