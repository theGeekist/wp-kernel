[**WP Kernel API v0.9.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [contracts](../README.md) / WPK_EXIT_CODES

# Variable: WPK_EXIT_CODES

```ts
const WPK_EXIT_CODES: object;
```

Framework-wide exit codes for CLI tooling and scripts.

## Type Declaration

### SUCCESS

```ts
readonly SUCCESS: 0 = 0;
```

Command completed successfully.

### VALIDATION_ERROR

```ts
readonly VALIDATION_ERROR: 1 = 1;
```

User/action validation failed.

### UNEXPECTED_ERROR

```ts
readonly UNEXPECTED_ERROR: 2 = 2;
```

Runtime failure outside adapter evaluation.

### ADAPTER_ERROR

```ts
readonly ADAPTER_ERROR: 3 = 3;
```

Adapter or extension evaluation failed.
