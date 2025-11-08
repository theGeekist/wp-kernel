[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / StatusValidationMacroOptions

# Interface: StatusValidationMacroOptions

## Extends

- `MacroOptionsBase`

## Properties

### pascalName

```ts
readonly pascalName: string;
```

---

### target

```ts
readonly target: MacroExpression;
```

---

### metadataKeys

```ts
readonly metadataKeys: MutationMetadataKeys;
```

#### Inherited from

```ts
MacroOptionsBase.metadataKeys;
```

---

### statusVariable?

```ts
readonly optional statusVariable: MacroExpression;
```

---

### requestVariable?

```ts
readonly optional requestVariable: MacroExpression;
```

---

### statusParam?

```ts
readonly optional statusParam: string;
```

---

### guardWithNullCheck?

```ts
readonly optional guardWithNullCheck: boolean;
```
