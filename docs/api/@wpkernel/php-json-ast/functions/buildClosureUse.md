[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildClosureUse

# Function: buildClosureUse()

```ts
function buildClosureUse(variable, options, attributes?): PhpClosureUse;
```

Builds a PHP closure use node.

## Parameters

### variable

[`PhpExprVariable`](../interfaces/PhpExprVariable.md)

The variable being used in the closure.

### options

Optional configuration for the use (by reference).

#### byRef?

`boolean`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpClosureUse`](../interfaces/PhpClosureUse.md)

A `PhpClosureUse` node.
