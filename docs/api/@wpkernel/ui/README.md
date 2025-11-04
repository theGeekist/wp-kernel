**WP Kernel API v0.11.0**

---

# WP Kernel API v0.11.0

WP Kernel UI - Component Library Package

Reusable UI components for WP Kernel.

## Interfaces

### Actions

- [UseActionOptions](interfaces/UseActionOptions.md)
- [UseActionResult](interfaces/UseActionResult.md)

### DataViews Integration

- [CreateDataFormControllerOptions](interfaces/CreateDataFormControllerOptions.md)
- [UseDataFormController](interfaces/UseDataFormController.md)
- [DataFormControllerState](interfaces/DataFormControllerState.md)
- [ResourceDataViewController](interfaces/ResourceDataViewController.md)
- [ResourceDataViewControllerOptions](interfaces/ResourceDataViewControllerOptions.md)
- [ResourceDataViewSavedView](interfaces/ResourceDataViewSavedView.md)
- [DataViewsStandaloneRuntime](interfaces/DataViewsStandaloneRuntime.md)
- [DataViewsRuntimeOptions](interfaces/DataViewsRuntimeOptions.md)
- [ResourceDataViewProps](interfaces/ResourceDataViewProps.md)

### Provider

- [WPKernelUIProviderProps](interfaces/WPKernelUIProviderProps.md)

### Other

- [UseResourceItemResult](interfaces/UseResourceItemResult.md)
- [UseResourceListResult](interfaces/UseResourceListResult.md)
- [ResourceDataViewConfig](interfaces/ResourceDataViewConfig.md)
- [ResourceDataViewActionConfig](interfaces/ResourceDataViewActionConfig.md)
- [DataViewsRuntimeContext](interfaces/DataViewsRuntimeContext.md)
- [DataViewsControllerRuntime](interfaces/DataViewsControllerRuntime.md)
- [WPKernelDataViewsRuntime](interfaces/WPKernelDataViewsRuntime.md)
- [NormalizedDataViewsRuntimeOptions](interfaces/NormalizedDataViewsRuntimeOptions.md)
- [DataViewRegistryEntry](interfaces/DataViewRegistryEntry.md)
- [DataViewsEventEmitter](interfaces/DataViewsEventEmitter.md)
- [DataViewPreferencesRuntime](interfaces/DataViewPreferencesRuntime.md)
- [DataViewPreferencesAdapter](interfaces/DataViewPreferencesAdapter.md)

### Prefetching

- [Prefetcher](interfaces/Prefetcher.md)
- [HoverPrefetchOptions](interfaces/HoverPrefetchOptions.md)
- [VisiblePrefetchOptions](interfaces/VisiblePrefetchOptions.md)
- [NextPagePrefetchOptions](interfaces/NextPagePrefetchOptions.md)

## Type Aliases

### DataViews Integration

- [ResourceDataViewMenuConfig](type-aliases/ResourceDataViewMenuConfig.md)
- [ResourceDataViewScreenConfig](type-aliases/ResourceDataViewScreenConfig.md)
- [WPKUICapabilityRuntimeSource](type-aliases/WPKUICapabilityRuntimeSource.md)

### Other

- [QueryMapping](type-aliases/QueryMapping.md)
- [DataViewChangedPayload](type-aliases/DataViewChangedPayload.md)
- [DataViewRegisteredPayload](type-aliases/DataViewRegisteredPayload.md)
- [DataViewActionTriggeredPayload](type-aliases/DataViewActionTriggeredPayload.md)
- [DataViewPreferenceScope](type-aliases/DataViewPreferenceScope.md)

### Prefetching

- [PrefetchGet](type-aliases/PrefetchGet.md)
- [PrefetchList](type-aliases/PrefetchList.md)

## Variables

### Provider

- [attachUIBindings](variables/attachUIBindings.md)

### Other

- [VERSION](variables/VERSION.md)

## Functions

### Actions

- [useAction](functions/useAction.md)

### DataViews Integration

- [ResourceDataView](functions/ResourceDataView.md)
- [createResourceDataViewController](functions/createResourceDataViewController.md)
- [createDataFormController](functions/createDataFormController.md)
- [createDataViewsRuntime](functions/createDataViewsRuntime.md)
- [ensureControllerRuntime](functions/ensureControllerRuntime.md)

### Provider

- [WPKernelUIProvider](functions/WPKernelUIProvider.md)
- [useWPKernelUI](functions/useWPKernelUI.md)

### Other

- [useCapability](functions/useCapability.md)
- [attachResourceHooks](functions/attachResourceHooks.md)
- [usePrefetcher](functions/usePrefetcher.md)

### Prefetching

- [useHoverPrefetch](functions/useHoverPrefetch.md)
- [useVisiblePrefetch](functions/useVisiblePrefetch.md)
- [useNextPagePrefetch](functions/useNextPagePrefetch.md)
