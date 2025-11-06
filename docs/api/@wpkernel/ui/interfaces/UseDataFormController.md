[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / UseDataFormController

# Interface: UseDataFormController\<TResult\>

Interface for the Data Form Controller hook.

## Type Parameters

### TResult

`TResult`

The type of the result returned by the form submission action.

## Properties

### submit()

```ts
submit: (input) => Promise & lt;
TResult & gt;
```

Submits the form with the given input.

#### Parameters

##### input

`unknown`

The input data for the form.

#### Returns

`Promise`\<`TResult`\>

A promise that resolves with the action's result.

---

### reset()

```ts
reset: () => void;
```

Resets the form's state.

#### Returns

`void`

---

### cancel()

```ts
cancel: () => void;
```

Cancels any in-flight form submissions.

#### Returns

`void`

---

### state

```ts
state: DataFormControllerState & lt;
TResult & gt;
```

The current state of the form.
