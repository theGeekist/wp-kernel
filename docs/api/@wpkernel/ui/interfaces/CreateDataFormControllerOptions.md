[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / CreateDataFormControllerOptions

# Interface: CreateDataFormControllerOptions\&lt;TInput, TResult, TQuery\&gt;

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
optional resource: ResourceObject&lt;unknown, TQuery&gt;;
```

---

### invalidate()?

```ts
optional invalidate: (result, input) =&gt; false | CacheKeyPattern[];
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
optional onSuccess: (result) =&gt; void;
```

#### Parameters

##### result

`TResult`

#### Returns

`void`

---

### onError()?

```ts
optional onError: (error) =&gt; void;
```

#### Parameters

##### error

`WPKernelError`

#### Returns

`void`
