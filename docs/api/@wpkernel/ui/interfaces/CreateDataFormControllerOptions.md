[**@wpkernel/ui v0.12.0**](../README.md)

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
action: DefinedAction & lt;
(TInput, TResult & gt);
```

---

### runtime

```ts
runtime: DataViewsRuntimeContext;
```

---

### resourceName

```ts
resourceName: string;
```

---

### resource?

```ts
optional resource: ResourceObject<unknown, TQuery>;
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

### onError()?

```ts
optional onError: (error) => void;
```

#### Parameters

##### error

`WPKernelError`

#### Returns

`void`
