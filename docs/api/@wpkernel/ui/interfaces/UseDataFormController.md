[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / UseDataFormController

# Interface: UseDataFormController\<TResult\>

Interface for the Data Form Controller hook.

## Type Parameters

### TResult

`TResult`

The type of the result returned by the form submission action.

## Properties

### cancel()

```ts
cancel: () => void;
```

Cancels any in-flight form submissions.

#### Returns

`void`

---

### reset()

```ts
reset: () => void;
```

Resets the form's state.

#### Returns

`void`

---

### state

```ts
state: DataFormControllerState<TResult>;
```

The current state of the form.

---

### submit()

```ts
submit: (input) => Promise<TResult>;
```

Submits the form with the given input.

#### Parameters

##### input

`unknown`

The input data for the form.

#### Returns

`Promise`\<`TResult`\>

A promise that resolves with the action's result.
