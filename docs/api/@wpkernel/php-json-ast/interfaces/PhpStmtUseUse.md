[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpStmtUseUse

# Interface: PhpStmtUseUse

Represents an item within a PHP `use` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "UseItem";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### name

```ts
readonly name: PhpName;
```

***

### alias

```ts
readonly alias: PhpIdentifier | null;
```

***

### type

```ts
readonly type: number;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
