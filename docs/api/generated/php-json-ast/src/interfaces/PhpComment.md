[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpComment

# Interface: PhpComment

## Extends

- [`PhpCommentLocation`](PhpCommentLocation.md)

## Properties

### line?

```ts
readonly optional line: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`line`](PhpCommentLocation.md#line)

---

### filePos?

```ts
readonly optional filePos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`filePos`](PhpCommentLocation.md#filepos)

---

### tokenPos?

```ts
readonly optional tokenPos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`tokenPos`](PhpCommentLocation.md#tokenpos)

---

### endLine?

```ts
readonly optional endLine: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`endLine`](PhpCommentLocation.md#endline)

---

### endFilePos?

```ts
readonly optional endFilePos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`endFilePos`](PhpCommentLocation.md#endfilepos)

---

### endTokenPos?

```ts
readonly optional endTokenPos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`endTokenPos`](PhpCommentLocation.md#endtokenpos)

---

### nodeType

```ts
readonly nodeType: "Comment" | `Comment_${string}`;
```

---

### text

```ts
readonly text: string;
```
