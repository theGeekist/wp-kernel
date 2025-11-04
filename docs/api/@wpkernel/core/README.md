**@wpkernel/core v0.11.0**

---

# @wpkernel/core v0.11.0

WP Kernel - Core Framework Package

Rails-like framework for building modern WordPress products where
JavaScript is the source of truth and PHP is a thin contract.

## Examples

```ts
import { fetch } from '@wpkernel/core/http';
import { defineResource } from '@wpkernel/core/resource';
import { WPKernelError } from '@wpkernel/core/error';
```

```ts
import { fetch, defineResource, WPKernelError } from '@wpkernel/core';
```

## Classes

### Events

- [WPKernelEventBus](classes/WPKernelEventBus.md)

### Other

- [WPKernelError](classes/WPKernelError.md)
- [TransportError](classes/TransportError.md)
- [ServerError](classes/ServerError.md)

## Interfaces

- [ResourceUIConfig](interfaces/ResourceUIConfig.md)
- [ResourceAdminUIConfig](interfaces/ResourceAdminUIConfig.md)
- [ResourceDataViewsUIConfig](interfaces/ResourceDataViewsUIConfig.md)
- [ResourceDataViewsScreenConfig](interfaces/ResourceDataViewsScreenConfig.md)
- [ResourceDataViewsMenuConfig](interfaces/ResourceDataViewsMenuConfig.md)
- [ConfigureWPKernelOptions](interfaces/ConfigureWPKernelOptions.md)
- [WPKInstance](interfaces/WPKInstance.md)
- [WPKUIConfig](interfaces/WPKUIConfig.md)
- [WPKernelUIRuntime](interfaces/WPKernelUIRuntime.md)
- [UIIntegrationOptions](interfaces/UIIntegrationOptions.md)
- [WPKUICapabilityRuntime](interfaces/WPKUICapabilityRuntime.md)
- [DefineInteractionOptions](interfaces/DefineInteractionOptions.md)
- [DefinedInteraction](interfaces/DefinedInteraction.md)
- [InteractionActionBinding](interfaces/InteractionActionBinding.md)
- [InteractivityGlobal](interfaces/InteractivityGlobal.md)
- [InteractivityModule](interfaces/InteractivityModule.md)
- [HydrateServerStateInput](interfaces/HydrateServerStateInput.md)

## Type Aliases

- [ActionLifecyclePhase](type-aliases/ActionLifecyclePhase.md)
- [WPKExitCode](type-aliases/WPKExitCode.md)
- [ErrorCode](type-aliases/ErrorCode.md)
- [ErrorContext](type-aliases/ErrorContext.md)
- [ErrorData](type-aliases/ErrorData.md)
- [SerializedError](type-aliases/SerializedError.md)
- [WordPressRESTError](type-aliases/WordPressRESTError.md)
- [HttpMethod](type-aliases/HttpMethod.md)
- [TransportRequest](type-aliases/TransportRequest.md)
- [TransportResponse](type-aliases/TransportResponse.md)
- [TransportMeta](type-aliases/TransportMeta.md)
- [ResourceRequestEvent](type-aliases/ResourceRequestEvent.md)
- [ResourceResponseEvent](type-aliases/ResourceResponseEvent.md)
- [ResourceErrorEvent](type-aliases/ResourceErrorEvent.md)
- [AnyFn](type-aliases/AnyFn.md)
- [ResourceRoute](type-aliases/ResourceRoute.md)
- [ResourceRoutes](type-aliases/ResourceRoutes.md)
- [ResourceIdentityConfig](type-aliases/ResourceIdentityConfig.md)
- [ResourcePostMetaDescriptor](type-aliases/ResourcePostMetaDescriptor.md)
- [ResourceStorageConfig](type-aliases/ResourceStorageConfig.md)
- [ResourceStoreOptions](type-aliases/ResourceStoreOptions.md)
- [CacheKeyFn](type-aliases/CacheKeyFn.md)
- [CacheKeys](type-aliases/CacheKeys.md)
- [ResourceQueryParamDescriptor](type-aliases/ResourceQueryParamDescriptor.md)
- [ResourceQueryParams](type-aliases/ResourceQueryParams.md)
- [ResourceConfig](type-aliases/ResourceConfig.md)
- [ListResponse](type-aliases/ListResponse.md)
- [ResourceClient](type-aliases/ResourceClient.md)
- [ResourceObject](type-aliases/ResourceObject.md)
- [ResourceState](type-aliases/ResourceState.md)
- [ResourceActions](type-aliases/ResourceActions.md)
- [ResourceSelectors](type-aliases/ResourceSelectors.md)
- [ResourceResolvers](type-aliases/ResourceResolvers.md)
- [ResourceStoreConfig](type-aliases/ResourceStoreConfig.md)
- [ResourceStore](type-aliases/ResourceStore.md)
- [ResourceListStatus](type-aliases/ResourceListStatus.md)
- [PathParams](type-aliases/PathParams.md)
- [CacheKeyPattern](type-aliases/CacheKeyPattern.md)
- [InvalidateOptions](type-aliases/InvalidateOptions.md)
- [ActionEnvelope](type-aliases/ActionEnvelope.md)
- [ActionConfig](type-aliases/ActionConfig.md)
- [ActionContext](type-aliases/ActionContext.md)
- [ActionFn](type-aliases/ActionFn.md)
- [ActionOptions](type-aliases/ActionOptions.md)
- [ActionLifecycleEvent](type-aliases/ActionLifecycleEvent.md)
- [ActionLifecycleEventBase](type-aliases/ActionLifecycleEventBase.md)
- [ActionStartEvent](type-aliases/ActionStartEvent.md)
- [ActionCompleteEvent](type-aliases/ActionCompleteEvent.md)
- [ActionErrorEvent](type-aliases/ActionErrorEvent.md)
- [DefinedAction](type-aliases/DefinedAction.md)
- [ActionJobs](type-aliases/ActionJobs.md)
- [WaitOptions](type-aliases/WaitOptions.md)
- [ReduxMiddleware](type-aliases/ReduxMiddleware.md)
- [ReduxMiddlewareAPI](type-aliases/ReduxMiddlewareAPI.md)
- [ReduxDispatch](type-aliases/ReduxDispatch.md)
- [CapabilityRule](type-aliases/CapabilityRule.md)
- [CapabilityMap](type-aliases/CapabilityMap.md)
- [CapabilityHelpers](type-aliases/CapabilityHelpers.md)
- [CapabilityOptions](type-aliases/CapabilityOptions.md)
- [CapabilityDefinitionConfig](type-aliases/CapabilityDefinitionConfig.md)
- [CapabilityContext](type-aliases/CapabilityContext.md)
- [CapabilityCache](type-aliases/CapabilityCache.md)
- [CapabilityCacheOptions](type-aliases/CapabilityCacheOptions.md)
- [CapabilityDeniedEvent](type-aliases/CapabilityDeniedEvent.md)
- [CapabilityReporter](type-aliases/CapabilityReporter.md)
- [CapabilityAdapters](type-aliases/CapabilityAdapters.md)
- [CapabilityProxyOptions](type-aliases/CapabilityProxyOptions.md)
- [ParamsOf](type-aliases/ParamsOf.md)
- [WPKernelEventsPluginOptions](type-aliases/WPKernelEventsPluginOptions.md)
- [WPKernelRegistry](type-aliases/WPKernelRegistry.md)
- [WPKernelUIAttach](type-aliases/WPKernelUIAttach.md)
- [NoticeStatus](type-aliases/NoticeStatus.md)
- [WPKernelReduxMiddleware](type-aliases/WPKernelReduxMiddleware.md)
- [InteractionActionInput](type-aliases/InteractionActionInput.md)
- [InteractionActionsRecord](type-aliases/InteractionActionsRecord.md)
- [InteractionActionMetaResolver](type-aliases/InteractionActionMetaResolver.md)
- [InteractionActionsRuntime](type-aliases/InteractionActionsRuntime.md)
- [InteractivityStoreResult](type-aliases/InteractivityStoreResult.md)
- [InteractivityServerState](type-aliases/InteractivityServerState.md)
- [InteractivityServerStateResolver](type-aliases/InteractivityServerStateResolver.md)
- [DeepReadonly](type-aliases/DeepReadonly.md)
- [ResourceCacheSync](type-aliases/ResourceCacheSync.md)
- [WPKernelEventMap](type-aliases/WPKernelEventMap.md)
- [ResourceDefinedEvent](type-aliases/ResourceDefinedEvent.md)
- [ActionDefinedEvent](type-aliases/ActionDefinedEvent.md)
- [ActionDomainEvent](type-aliases/ActionDomainEvent.md)
- [CacheInvalidatedEvent](type-aliases/CacheInvalidatedEvent.md)
- [CustomKernelEvent](type-aliases/CustomKernelEvent.md)
- [GenericResourceDefinedEvent](type-aliases/GenericResourceDefinedEvent.md)
- [Listener](type-aliases/Listener.md)
- [Reporter](type-aliases/Reporter.md)
- [ReporterOptions](type-aliases/ReporterOptions.md)
- [ReporterLevel](type-aliases/ReporterLevel.md)
- [ReporterChannel](type-aliases/ReporterChannel.md)
- [NamespaceDetectionOptions](type-aliases/NamespaceDetectionOptions.md)
- [NamespaceDetectionResult](type-aliases/NamespaceDetectionResult.md)
- [NamespaceDetectionMode](type-aliases/NamespaceDetectionMode.md)
- [NamespaceRuntimeContext](type-aliases/NamespaceRuntimeContext.md)

## Variables

- [VERSION](variables/VERSION.md)
- [getWPData](variables/getWPData.md)
- [ACTION_LIFECYCLE_PHASES](variables/ACTION_LIFECYCLE_PHASES.md)
- [WPK_CONFIG_SOURCES](variables/WPK_CONFIG_SOURCES.md)
- [WPK_EVENTS](variables/WPK_EVENTS.md)
- [WPK_EXIT_CODES](variables/WPK_EXIT_CODES.md)
- [WPK_INFRASTRUCTURE](variables/WPK_INFRASTRUCTURE.md)
- [WPK_NAMESPACE](variables/WPK_NAMESPACE.md)
- [WPK_SUBSYSTEM_NAMESPACES](variables/WPK_SUBSYSTEM_NAMESPACES.md)

## Functions

### HTTP

- [fetch](functions/fetch.md)

### Resource

- [defineResource](functions/defineResource.md)
- [interpolatePath](functions/interpolatePath.md)
- [invalidate](functions/invalidate.md)
- [normalizeCacheKey](functions/normalizeCacheKey.md)
- [createStore](functions/createStore.md)

### Actions

- [defineAction](functions/defineAction.md)
- [createActionMiddleware](functions/createActionMiddleware.md)
- [invokeAction](functions/invokeAction.md)

### Capability

- [defineCapability](functions/defineCapability.md)
- [createCapabilityProxy](functions/createCapabilityProxy.md)

### Data

- [configureWPKernel](functions/configureWPKernel.md)
- [registerWPKernelStore](functions/registerWPKernelStore.md)
- [wpkEventsPlugin](functions/wpkEventsPlugin.md)

### Interactivity

- [defineInteraction](functions/defineInteraction.md)

### Events

- [getWPKernelEventBus](functions/getWPKernelEventBus.md)
- [setWPKernelEventBus](functions/setWPKernelEventBus.md)
- [getRegisteredResources](functions/getRegisteredResources.md)
- [getRegisteredActions](functions/getRegisteredActions.md)
- [clearRegisteredResources](functions/clearRegisteredResources.md)
- [clearRegisteredActions](functions/clearRegisteredActions.md)

### Reporter

- [createReporter](functions/createReporter.md)
- [createNoopReporter](functions/createNoopReporter.md)
- [getWPKernelReporter](functions/getWPKernelReporter.md)
- [setWPKernelReporter](functions/setWPKernelReporter.md)
- [clearWPKReporter](functions/clearWPKReporter.md)

### Namespace

- [detectNamespace](functions/detectNamespace.md)
- [getNamespace](functions/getNamespace.md)
- [isValidNamespace](functions/isValidNamespace.md)
- [sanitizeNamespace](functions/sanitizeNamespace.md)

### Other

- [serializeWPKernelError](functions/serializeWPKernelError.md)
