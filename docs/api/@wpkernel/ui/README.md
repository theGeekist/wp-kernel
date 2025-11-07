**@wpkernel/ui v0.12.0**

---

# @wpkernel/ui v0.12.0

WPKernel UI - Component Library Package

Reusable UI components for WPKernel.

## Interfaces

### DataViews Integration

- [CreateDataFormControllerOptions](interfaces/CreateDataFormControllerOptions.md)
- [UseDataFormController](interfaces/UseDataFormController.md)
- [DataFormControllerState](interfaces/DataFormControllerState.md)
- [ResourceDataViewController](interfaces/ResourceDataViewController.md)
- [ResourceDataViewControllerOptions](interfaces/ResourceDataViewControllerOptions.md)
- [ResourceDataViewSavedView](interfaces/ResourceDataViewSavedView.md)
- [DataViewsStandaloneRuntime](interfaces/DataViewsStandaloneRuntime.md)
- [DataViewsRuntimeOptions](interfaces/DataViewsRuntimeOptions.md)
- [CreateDataViewInteractionOptions](interfaces/CreateDataViewInteractionOptions.md)
- [DataViewInteractionResult](interfaces/DataViewInteractionResult.md)
- [ResourceDataViewProps](interfaces/ResourceDataViewProps.md)

### Action Bindings

- [UseActionOptions](interfaces/UseActionOptions.md)
- [UseActionResult](interfaces/UseActionResult.md)

### Provider

- [WPKernelUIProviderProps](interfaces/WPKernelUIProviderProps.md)

### Utilities

- [UseResourceItemResult](interfaces/UseResourceItemResult.md)
- [UseResourceListResult](interfaces/UseResourceListResult.md)
- [Prefetcher](interfaces/Prefetcher.md)
- [HoverPrefetchOptions](interfaces/HoverPrefetchOptions.md)
- [VisiblePrefetchOptions](interfaces/VisiblePrefetchOptions.md)
- [NextPagePrefetchOptions](interfaces/NextPagePrefetchOptions.md)

### Other

- [ResourceDataViewConfig](interfaces/ResourceDataViewConfig.md)
- [ResourceDataViewActionConfig](interfaces/ResourceDataViewActionConfig.md)
- [DataViewsRuntimeContext](interfaces/DataViewsRuntimeContext.md)
- [DataViewsControllerRuntime](interfaces/DataViewsControllerRuntime.md)
- [WPKernelDataViewsRuntime](interfaces/WPKernelDataViewsRuntime.md)
- [NormalizedDataViewsRuntimeOptions](interfaces/NormalizedDataViewsRuntimeOptions.md)
- [DataViewRegistryEntry](interfaces/DataViewRegistryEntry.md)
- [DataViewsEventEmitter](interfaces/DataViewsEventEmitter.md)
- [SubscribeToDataViewsEventOptions](interfaces/SubscribeToDataViewsEventOptions.md)
- [DataViewPreferencesRuntime](interfaces/DataViewPreferencesRuntime.md)
- [DataViewPreferencesAdapter](interfaces/DataViewPreferencesAdapter.md)

## Type Aliases

### DataViews Integration

- [ResourceDataViewMenuConfig](type-aliases/ResourceDataViewMenuConfig.md)
- [ResourceDataViewScreenConfig](type-aliases/ResourceDataViewScreenConfig.md)
- [WPKUICapabilityRuntimeSource](type-aliases/WPKUICapabilityRuntimeSource.md)
- [DataViewInteractionState](type-aliases/DataViewInteractionState.md)

### Utilities

- [PrefetchGet](type-aliases/PrefetchGet.md)
- [PrefetchList](type-aliases/PrefetchList.md)

### Other

- [QueryMapping](type-aliases/QueryMapping.md)
- [DataViewChangedPayload](type-aliases/DataViewChangedPayload.md)
- [DataViewRegisteredPayload](type-aliases/DataViewRegisteredPayload.md)
- [DataViewActionTriggeredPayload](type-aliases/DataViewActionTriggeredPayload.md)
- [DataViewPermissionDeniedPayload](type-aliases/DataViewPermissionDeniedPayload.md)
- [DataViewFetchFailedPayload](type-aliases/DataViewFetchFailedPayload.md)
- [DataViewBoundaryTransitionPayload](type-aliases/DataViewBoundaryTransitionPayload.md)
- [DataViewBoundaryState](type-aliases/DataViewBoundaryState.md)
- [DataViewsEventName](type-aliases/DataViewsEventName.md)
- [DataViewsEventPayloadMap](type-aliases/DataViewsEventPayloadMap.md)
- [DataViewPreferenceScope](type-aliases/DataViewPreferenceScope.md)

## Variables

### Provider

- [attachUIBindings](variables/attachUIBindings.md)

### Other

- [VERSION](variables/VERSION.md)

## Functions

### DataViews Integration

- [ResourceDataView](functions/ResourceDataView.md)
- [createResourceDataViewController](functions/createResourceDataViewController.md)
- [createDataFormController](functions/createDataFormController.md)
- [createDataViewsRuntime](functions/createDataViewsRuntime.md)
- [ensureControllerRuntime](functions/ensureControllerRuntime.md)
- [createDataViewInteraction](functions/createDataViewInteraction.md)

### Action Bindings

- [useAction](functions/useAction.md)

### Provider

- [WPKernelUIProvider](functions/WPKernelUIProvider.md)
- [useWPKernelUI](functions/useWPKernelUI.md)

### Utilities

- [useCapability](functions/useCapability.md)
- [attachResourceHooks](functions/attachResourceHooks.md)
- [usePrefetcher](functions/usePrefetcher.md)
- [useHoverPrefetch](functions/useHoverPrefetch.md)
- [useVisiblePrefetch](functions/useVisiblePrefetch.md)
- [useNextPagePrefetch](functions/useNextPagePrefetch.md)

### Other

- [subscribeToDataViewsEvent](functions/subscribeToDataViewsEvent.md)
- [useDataViewsEvent](functions/useDataViewsEvent.md)
