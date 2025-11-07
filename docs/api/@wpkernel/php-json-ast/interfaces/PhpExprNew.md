[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprNew

# Interface: PhpExprNew

Represents a PHP `new` expression (e.g., `new MyClass()`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_New";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### class

```ts
readonly class: PhpExpr | PhpName;
```

---

### args

```ts
readonly args: PhpArg[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
