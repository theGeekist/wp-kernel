[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / UseActionResult

# Interface: UseActionResult\&lt;TInput, TResult\&gt;

The result of the useAction hook.

## Extends

- `UseActionState`\&lt;`TResult`\&gt;

## Type Parameters

### TInput

`TInput`

### TResult

`TResult`

## Properties

### run()

```ts
run: (input) =&gt; Promise&lt;TResult&gt;;
```

A function to run the action.

#### Parameters

##### input

`TInput`

The input to the action.

#### Returns

`Promise`\&lt;`TResult`\&gt;

A promise that resolves with the result of the action.

---

### cancel()

```ts
cancel: () =&gt; void;
```

A function to cancel all in-flight requests.

#### Returns

`void`

---

### reset()

```ts
reset: () =&gt; void;
```

A function to reset the state of the hook.

#### Returns

`void`

---

### status

```ts
status: 'idle' | 'running' | 'success' | 'error';
```

The status of the action.

#### Inherited from

```ts
UseActionState.status;
```

---

### inFlight

```ts
inFlight: number;
```

The number of in-flight requests.

#### Inherited from

```ts
UseActionState.inFlight;
```

---

### error?

```ts
optional error: WPKernelError;
```

The error, if the action failed.

#### Inherited from

```ts
UseActionState.error;
```

---

### result?

```ts
optional result: TResult;
```

The result of the action.

#### Inherited from

```ts
UseActionState.result;
```
