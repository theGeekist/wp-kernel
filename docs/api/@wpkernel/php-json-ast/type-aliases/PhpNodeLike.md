[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpNodeLike

# Type Alias: PhpNodeLike

```ts
type PhpNodeLike =
	| PhpStmt
	| PhpExpr
	| PhpScalar
	| PhpType
	| PhpAttribute
	| PhpAttrGroup
	| PhpParam
	| PhpArg
	| PhpConst
	| PhpClosureUse
	| PhpMatchArm
	| PhpPropertyHook;
```

Represents any PHP AST node that can be part of the syntax tree.
