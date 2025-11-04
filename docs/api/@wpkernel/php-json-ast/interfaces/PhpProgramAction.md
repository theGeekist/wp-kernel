[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpProgramAction

# Interface: PhpProgramAction

## Properties

### file

```ts
readonly file: string;
```

---

### program

```ts
readonly program: PhpProgram;
```

---

### metadata

```ts
readonly metadata: PhpFileMetadata;
```

---

### docblock

```ts
readonly docblock: readonly string[];
```

---

### uses

```ts
readonly uses: readonly string[];
```

---

### statements

```ts
readonly statements: readonly string[];
```

---

### codemod?

```ts
readonly optional codemod: PhpProgramCodemodResult;
```
