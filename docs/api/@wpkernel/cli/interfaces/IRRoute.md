[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / IRRoute

# Interface: IRRoute

Represents an Intermediate Representation (IR) for a resource route.

## Properties

### method

```ts
method: string;
```

The HTTP method of the route (e.g., 'GET', 'POST').

---

### path

```ts
path: string;
```

The URL path of the route.

---

### hash

```ts
hash: string;
```

A hash of the route definition for change detection.

---

### transport

```ts
transport: IRRouteTransport;
```

The transport mechanism for the route (local or remote).

---

### capability?

```ts
optional capability: string;
```

Optional: The capability required to access this route.
