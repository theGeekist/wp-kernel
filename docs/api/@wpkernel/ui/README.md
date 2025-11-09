**@wpkernel/ui v0.12.1-beta.2**

---

# @wpkernel/ui v0.12.1-beta.2

WPKernel UI - Component Library Package

Reusable UI components for WPKernel.

## Interfaces

### DataViews Integration

- [CreateDataFormControllerOptions](interfaces/CreateDataFormControllerOptions.md)
- [CreateDataViewInteractionOptions](interfaces/CreateDataViewInteractionOptions.md)
- [DataFormControllerState](interfaces/DataFormControllerState.md)
- [DataViewInteractionResult](interfaces/DataViewInteractionResult.md)
- [DataViewsRuntimeOptions](interfaces/DataViewsRuntimeOptions.md)
- [DataViewsStandaloneRuntime](interfaces/DataViewsStandaloneRuntime.md)
- [ResourceDataViewController](interfaces/ResourceDataViewController.md)
- [ResourceDataViewControllerOptions](interfaces/ResourceDataViewControllerOptions.md)
- [ResourceDataViewProps](interfaces/ResourceDataViewProps.md)
- [ResourceDataViewSavedView](interfaces/ResourceDataViewSavedView.md)
- [UseDataFormController](interfaces/UseDataFormController.md)

### Action Bindings

- [UseActionOptions](interfaces/UseActionOptions.md)
- [UseActionResult](interfaces/UseActionResult.md)

### Provider

- [WPKernelUIProviderProps](interfaces/WPKernelUIProviderProps.md)

### Utilities

- [HoverPrefetchOptions](interfaces/HoverPrefetchOptions.md)
- [NextPagePrefetchOptions](interfaces/NextPagePrefetchOptions.md)
- [Prefetcher](interfaces/Prefetcher.md)
- [UseResourceItemResult](interfaces/UseResourceItemResult.md)
- [UseResourceListResult](interfaces/UseResourceListResult.md)
- [VisiblePrefetchOptions](interfaces/VisiblePrefetchOptions.md)

### Other

- [DataViewPreferencesAdapter](interfaces/DataViewPreferencesAdapter.md)
- [DataViewPreferencesRuntime](interfaces/DataViewPreferencesRuntime.md)
- [DataViewRegistryEntry](interfaces/DataViewRegistryEntry.md)
- [DataViewsControllerRuntime](interfaces/DataViewsControllerRuntime.md)
- [DataViewsEventEmitter](interfaces/DataViewsEventEmitter.md)
- [DataViewsRuntimeContext](interfaces/DataViewsRuntimeContext.md)
- [NormalizedDataViewsRuntimeOptions](interfaces/NormalizedDataViewsRuntimeOptions.md)
- [ResourceDataViewActionConfig](interfaces/ResourceDataViewActionConfig.md)
- [ResourceDataViewConfig](interfaces/ResourceDataViewConfig.md)
- [SubscribeToDataViewsEventOptions](interfaces/SubscribeToDataViewsEventOptions.md)
- [WPKernelDataViewsRuntime](interfaces/WPKernelDataViewsRuntime.md)

## Type Aliases

### DataViews Integration

- [DataViewInteractionState](type-aliases/DataViewInteractionState.md)
- [ResourceDataViewMenuConfig](type-aliases/ResourceDataViewMenuConfig.md)
- [ResourceDataViewScreenConfig](type-aliases/ResourceDataViewScreenConfig.md)
- [WPKUICapabilityRuntimeSource](type-aliases/WPKUICapabilityRuntimeSource.md)

### Utilities

- [PrefetchGet](type-aliases/PrefetchGet.md)
- [PrefetchList](type-aliases/PrefetchList.md)

### Other

- [DataViewActionTriggeredPayload](type-aliases/DataViewActionTriggeredPayload.md)
- [DataViewBoundaryState](type-aliases/DataViewBoundaryState.md)
- [DataViewBoundaryTransitionPayload](type-aliases/DataViewBoundaryTransitionPayload.md)
- [DataViewChangedPayload](type-aliases/DataViewChangedPayload.md)
- [DataViewFetchFailedPayload](type-aliases/DataViewFetchFailedPayload.md)
- [DataViewPermissionDeniedPayload](type-aliases/DataViewPermissionDeniedPayload.md)
- [DataViewPreferenceScope](type-aliases/DataViewPreferenceScope.md)
- [DataViewRegisteredPayload](type-aliases/DataViewRegisteredPayload.md)
- [DataViewsEventName](type-aliases/DataViewsEventName.md)
- [DataViewsEventPayloadMap](type-aliases/DataViewsEventPayloadMap.md)
- [QueryMapping](type-aliases/QueryMapping.md)

## Variables

### Provider

- [attachUIBindings](variables/attachUIBindings.md)

### Other

- [VERSION](variables/VERSION.md)

## Functions

### DataViews Integration

- [createDataFormController](functions/createDataFormController.md)
- [createDataViewInteraction](functions/createDataViewInteraction.md)
- [createDataViewsRuntime](functions/createDataViewsRuntime.md)
- [createResourceDataViewController](functions/createResourceDataViewController.md)
- [ensureControllerRuntime](functions/ensureControllerRuntime.md)
- [ResourceDataView](functions/ResourceDataView.md)

### Action Bindings

- [useAction](functions/useAction.md)

### Provider

- [useWPKernelUI](functions/useWPKernelUI.md)
- [WPKernelUIProvider](functions/WPKernelUIProvider.md)

### Utilities

- [attachResourceHooks](functions/attachResourceHooks.md)
- [useCapability](functions/useCapability.md)
- [useHoverPrefetch](functions/useHoverPrefetch.md)
- [useNextPagePrefetch](functions/useNextPagePrefetch.md)
- [usePrefetcher](functions/usePrefetcher.md)
- [useVisiblePrefetch](functions/useVisiblePrefetch.md)

### Other

- [subscribeToDataViewsEvent](functions/subscribeToDataViewsEvent.md)
- [useDataViewsEvent](functions/useDataViewsEvent.md)
