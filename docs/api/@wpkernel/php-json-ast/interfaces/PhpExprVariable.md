[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprVariable

# Interface: PhpExprVariable

Represents a PHP variable expression (e.g., `$foo`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_Variable";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### name

```ts
readonly name: string | PhpExpr;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
