[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / ResourceDataViewSavedView

# Interface: ResourceDataViewSavedView

Represents a saved view configuration.

## Indexable

```ts
[key: string]: unknown
```

Additional properties for the saved view.

## Properties

### id

```ts
id: string;
```

The unique identifier for the saved view.

***

### label

```ts
label: string;
```

The label for the saved view.

***

### view

```ts
view: View;
```

The view configuration object.

***

### description?

```ts
optional description: string;
```

An optional description for the saved view.

***

### isDefault?

```ts
optional isDefault: boolean;
```

Whether this is the default view.
