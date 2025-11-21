[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataView

# Function: ResourceDataView()

```ts
function ResourceDataView<TItem, TQuery>(props): Element;
```

A React component that renders a DataViews interface for a given resource.

This component integrates with the `@wordpress/dataviews` package to provide a flexible
and extensible way to display and interact with resource data. It handles data fetching,
state management, and action dispatching.

## Type Parameters

### TItem

`TItem`

The type of the items in the resource list.

### TQuery

`TQuery`

The type of the query parameters for the resource.

## Parameters

### props

[`ResourceDataViewProps`](../interfaces/ResourceDataViewProps.md)<`TItem`, `TQuery`>

The props for the component.

## Returns

`Element`

A React element that renders the DataViews interface.
