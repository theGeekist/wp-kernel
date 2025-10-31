[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ErrorData

# Type Alias: ErrorData

```ts
type ErrorData = object;
```

Data payload that can be attached to errors

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### originalError?

```ts
optional originalError: Error;
```

Original error if wrapping

---

### serverCode?

```ts
optional serverCode: string;
```

Server error details

---

### serverData?

```ts
optional serverData: unknown;
```

---

### serverMessage?

```ts
optional serverMessage: string;
```

---

### validationErrors?

```ts
optional validationErrors: object[];
```

Validation errors

#### code?

```ts
optional code: string;
```

#### field

```ts
field: string;
```

#### message

```ts
message: string;
```
