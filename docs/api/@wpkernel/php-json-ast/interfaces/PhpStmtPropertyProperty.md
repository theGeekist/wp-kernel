[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtPropertyProperty

# Interface: PhpStmtPropertyProperty

Represents a single property within a PHP class property declaration.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "PropertyItem";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### default

```ts
readonly default: PhpExpr | null;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
