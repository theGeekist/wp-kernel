[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / createResourceDataViewController

# Function: createResourceDataViewController()

```ts
function createResourceDataViewController&lt;TItem, TQuery&gt;(options): ResourceDataViewController&lt;TItem, TQuery&gt;;
```

Creates a controller for a ResourceDataView.

This function initializes and returns a `ResourceDataViewController` instance,
which manages the state and interactions for a DataViews interface tied to a specific resource.
It handles view state mapping, persistence, and event emission.

## Type Parameters

### TItem

`TItem`

The type of the items in the resource list.

### TQuery

`TQuery`

The type of the query parameters for the resource.

## Parameters

### options

[`ResourceDataViewControllerOptions`](../interfaces/ResourceDataViewControllerOptions.md)\&lt;`TItem`, `TQuery`\&gt;

Configuration options for the controller.

## Returns

[`ResourceDataViewController`](../interfaces/ResourceDataViewController.md)\&lt;`TItem`, `TQuery`\&gt;

A `ResourceDataViewController` instance.
