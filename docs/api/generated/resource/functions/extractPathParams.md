[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / extractPathParams

# Function: extractPathParams()

```ts
function extractPathParams(path): string[];
```

Defined in: [resource/interpolate.ts:101](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/interpolate.ts#L101)

Extract parameter names from a path

## Parameters

### path

`string`

REST path with :param placeholders

## Returns

`string`[]

Array of parameter names

## Example

```ts
extractPathParams('/wpk/v1/things/:id');
// => ['id']

extractPathParams('/wpk/v1/things/:id/comments/:commentId');
// => ['id', 'commentId']
```
