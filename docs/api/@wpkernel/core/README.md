**WP Kernel API v0.11.0**

---

# WP Kernel API v0.11.0

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
import { http, resource, error } from '@wpkernel/core';
await http.fetch({ path: '/my-plugin/v1/things' });
resource.defineResource({ name: 'thing', routes: {...} });
throw new error.WPKernelError('ValidationError', {...});
```

```ts
import { fetch, defineResource, WPKernelError } from '@wpkernel/core';
```

## Modules

- [@wpkernel/core/data](@wpkernel/core/data/README.md)

## Namespaces

- [http](WP-Kernel-API/namespaces/http/README.md)
- [resource](WP-Kernel-API/namespaces/resource/README.md)
- [error](WP-Kernel-API/namespaces/error/README.md)
- [namespace](WP-Kernel-API/namespaces/namespace/README.md)
- [actions](WP-Kernel-API/namespaces/actions/README.md)
- [capability](WP-Kernel-API/namespaces/capability/README.md)
- [@wpkernel/core/events](WP-Kernel-API/namespaces/@wpkernel/core/events/README.md)
- [contracts](WP-Kernel-API/namespaces/contracts/README.md)
- [pipeline](WP-Kernel-API/namespaces/pipeline/README.md)
- [interactivity](WP-Kernel-API/namespaces/interactivity/README.md)

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
- [UIIntegrationOptions](interfaces/UIIntegrationOptions.md)
- [WPKUICapabilityRuntime](interfaces/WPKUICapabilityRuntime.md)
- [DefineInteractionOptions](interfaces/DefineInteractionOptions.md)
- [DefinedInteraction](interfaces/DefinedInteraction.md)
- [InteractionActionBinding](interfaces/InteractionActionBinding.md)
- [InteractivityGlobal](interfaces/InteractivityGlobal.md)
- [InteractivityModule](interfaces/InteractivityModule.md)
- [HydrateServerStateInput](interfaces/HydrateServerStateInput.md)

## Type Aliases

- [ErrorCode](type-aliases/ErrorCode.md)
- [ErrorContext](type-aliases/ErrorContext.md)
- [ErrorData](type-aliases/ErrorData.md)
- [SerializedError](type-aliases/SerializedError.md)
- [HttpMethod](type-aliases/HttpMethod.md)
- [TransportRequest](type-aliases/TransportRequest.md)
- [TransportResponse](type-aliases/TransportResponse.md)
- [TransportMeta](type-aliases/TransportMeta.md)
- [ResourceRequestEvent](type-aliases/ResourceRequestEvent.md)
- [ResourceResponseEvent](type-aliases/ResourceResponseEvent.md)
- [ResourceErrorEvent](type-aliases/ResourceErrorEvent.md)
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
- [PathParams](type-aliases/PathParams.md)
- [CacheKeyPattern](type-aliases/CacheKeyPattern.md)
- [InvalidateOptions](type-aliases/InvalidateOptions.md)
- [ActionConfig](type-aliases/ActionConfig.md)
- [ActionContext](type-aliases/ActionContext.md)
- [ActionFn](type-aliases/ActionFn.md)
- [ActionOptions](type-aliases/ActionOptions.md)
- [ActionLifecycleEvent](type-aliases/ActionLifecycleEvent.md)
- [ActionStartEvent](type-aliases/ActionStartEvent.md)
- [ActionCompleteEvent](type-aliases/ActionCompleteEvent.md)
- [ActionErrorEvent](type-aliases/ActionErrorEvent.md)
- [DefinedAction](type-aliases/DefinedAction.md)
- [ActionJobs](type-aliases/ActionJobs.md)
- [WaitOptions](type-aliases/WaitOptions.md)
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
- [ParamsOf](type-aliases/ParamsOf.md)
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
- [WPK_CONFIG_SOURCES](variables/WPK_CONFIG_SOURCES.md)
- [WPK_EVENTS](variables/WPK_EVENTS.md)
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

## References

### ACTION_LIFECYCLE_PHASES

Re-exports [ACTION_LIFECYCLE_PHASES](WP-Kernel-API/namespaces/contracts/variables/ACTION_LIFECYCLE_PHASES.md)

---

### WPK_EXIT_CODES

Re-exports [WPK_EXIT_CODES](WP-Kernel-API/namespaces/contracts/variables/WPK_EXIT_CODES.md)

---

### serializeWPKernelError

Re-exports [serializeWPKernelError](WP-Kernel-API/namespaces/contracts/functions/serializeWPKernelError.md)

---

### ActionLifecyclePhase

Re-exports [ActionLifecyclePhase](WP-Kernel-API/namespaces/contracts/type-aliases/ActionLifecyclePhase.md)

---

### WPKExitCode

Re-exports [WPKExitCode](WP-Kernel-API/namespaces/contracts/type-aliases/WPKExitCode.md)

---

### WPKernelUIRuntime

Re-exports [WPKernelUIRuntime](@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)
