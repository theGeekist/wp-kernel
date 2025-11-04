[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpBuilderFactoryMethodIntent

# Interface: PhpBuilderFactoryMethodIntent

## Properties

### name

```ts
readonly name: string;
```

***

### visibility?

```ts
readonly optional visibility: "public" | "protected" | "private";
```

***

### isStatic?

```ts
readonly optional isStatic: boolean;
```

***

### returnType?

```ts
readonly optional returnType: string | null;
```

***

### parameters?

```ts
readonly optional parameters: readonly PhpBuilderFactoryParameterIntent[];
```

***

### docblock?

```ts
readonly optional docblock: readonly string[];
```

***

### body?

```ts
readonly optional body: readonly PhpBuilderFactoryMethodStep[];
```
