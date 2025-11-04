[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [error](../README.md) / WordPressRESTError

# Type Alias: WordPressRESTError

```ts
type WordPressRESTError = object;
```

WordPress REST API error response shape

This interface represents the standard error format returned by WordPress REST API.

## Properties

### code

```ts
code: string;
```

Error code from WordPress (e.g., 'rest_forbidden', 'invalid_param')

***

### message

```ts
message: string;
```

Human-readable error message

***

### data?

```ts
optional data: object;
```

Additional error data

#### Index Signature

```ts
[key: string]: unknown
```

#### status?

```ts
optional status: number;
```

HTTP status code

#### params?

```ts
optional params: Record&lt;string, string&gt;;
```

Invalid parameters that caused the error

#### details?

```ts
optional details: Record&lt;string, unknown&gt;;
```

Detailed validation or error information
