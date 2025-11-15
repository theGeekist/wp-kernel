[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / CreateDataFormControllerOptions

# Interface: CreateDataFormControllerOptions\<TInput, TResult, TQuery\>

Options for creating a `DataFormController`.

## Type Parameters

### TInput

`TInput`

### TResult

`TResult`

### TQuery

`TQuery`

## Properties

### action

```ts
action: DefinedAction<TInput, TResult>;
```

---

### resourceName

```ts
resourceName: string;
```

---

### runtime

```ts
runtime: DataViewsRuntimeContext;
```

---

### invalidate()?

```ts
optional invalidate: (result, input) => false | CacheKeyPattern[];
```

#### Parameters

##### result

`TResult`

##### input

`TInput`

#### Returns

`false` \| `CacheKeyPattern`[]

---

### onError()?

```ts
optional onError: (error) => void;
```

#### Parameters

##### error

`WPKernelError`

#### Returns

`void`

---

### onSuccess()?

```ts
optional onSuccess: (result) => void;
```

#### Parameters

##### result

`TResult`

#### Returns

`void`

---

### resource?

```ts
optional resource: ResourceObject<unknown, TQuery>;
```
