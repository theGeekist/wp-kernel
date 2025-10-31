[**WP Kernel API v0.10.0**](../../README.md)

---

[WP Kernel API](../../README.md) / core/src

# core/src

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

- [@wpkernel/core/events](namespaces/@wpkernel/core/events/README.md)
- [actions](namespaces/actions/README.md)
- [capability](namespaces/capability/README.md)
- [contracts](namespaces/contracts/README.md)
- [error](namespaces/error/README.md)
- [http](namespaces/http/README.md)
- [interactivity](namespaces/interactivity/README.md)
- [namespace](namespaces/namespace/README.md)
- [pipeline](namespaces/pipeline/README.md)
- [resource](namespaces/resource/README.md)

## Classes

- [ServerError](classes/ServerError.md)
- [TransportError](classes/TransportError.md)
- [WPKernelError](classes/WPKernelError.md)
- [WPKernelEventBus](classes/WPKernelEventBus.md)

## Interfaces

- [ConfigureWPKernelOptions](interfaces/ConfigureWPKernelOptions.md)
- [DefinedInteraction](interfaces/DefinedInteraction.md)
- [DefineInteractionOptions](interfaces/DefineInteractionOptions.md)
- [HydrateServerStateInput](interfaces/HydrateServerStateInput.md)
- [InteractionActionBinding](interfaces/InteractionActionBinding.md)
- [InteractivityGlobal](interfaces/InteractivityGlobal.md)
- [InteractivityModule](interfaces/InteractivityModule.md)
- [ResourceAdminUIConfig](interfaces/ResourceAdminUIConfig.md)
- [ResourceDataViewsMenuConfig](interfaces/ResourceDataViewsMenuConfig.md)
- [ResourceDataViewsScreenConfig](interfaces/ResourceDataViewsScreenConfig.md)
- [ResourceDataViewsUIConfig](interfaces/ResourceDataViewsUIConfig.md)
- [ResourceUIConfig](interfaces/ResourceUIConfig.md)
- [UIIntegrationOptions](interfaces/UIIntegrationOptions.md)
- [WPKInstance](interfaces/WPKInstance.md)
- [WPKUICapabilityRuntime](interfaces/WPKUICapabilityRuntime.md)
- [WPKUIConfig](interfaces/WPKUIConfig.md)

## Type Aliases

- [ActionCompleteEvent](type-aliases/ActionCompleteEvent.md)
- [ActionConfig](type-aliases/ActionConfig.md)
- [ActionContext](type-aliases/ActionContext.md)
- [ActionDefinedEvent](type-aliases/ActionDefinedEvent.md)
- [ActionDomainEvent](type-aliases/ActionDomainEvent.md)
- [ActionErrorEvent](type-aliases/ActionErrorEvent.md)
- [ActionFn](type-aliases/ActionFn.md)
- [ActionJobs](type-aliases/ActionJobs.md)
- [ActionLifecycleEvent](type-aliases/ActionLifecycleEvent.md)
- [ActionOptions](type-aliases/ActionOptions.md)
- [ActionStartEvent](type-aliases/ActionStartEvent.md)
- [CacheInvalidatedEvent](type-aliases/CacheInvalidatedEvent.md)
- [CacheKeyFn](type-aliases/CacheKeyFn.md)
- [CacheKeyPattern](type-aliases/CacheKeyPattern.md)
- [CacheKeys](type-aliases/CacheKeys.md)
- [CapabilityCache](type-aliases/CapabilityCache.md)
- [CapabilityCacheOptions](type-aliases/CapabilityCacheOptions.md)
- [CapabilityContext](type-aliases/CapabilityContext.md)
- [CapabilityDefinitionConfig](type-aliases/CapabilityDefinitionConfig.md)
- [CapabilityDeniedEvent](type-aliases/CapabilityDeniedEvent.md)
- [CapabilityHelpers](type-aliases/CapabilityHelpers.md)
- [CapabilityMap](type-aliases/CapabilityMap.md)
- [CapabilityOptions](type-aliases/CapabilityOptions.md)
- [CapabilityReporter](type-aliases/CapabilityReporter.md)
- [CapabilityRule](type-aliases/CapabilityRule.md)
- [CustomKernelEvent](type-aliases/CustomKernelEvent.md)
- [DefinedAction](type-aliases/DefinedAction.md)
- [ErrorCode](type-aliases/ErrorCode.md)
- [ErrorContext](type-aliases/ErrorContext.md)
- [ErrorData](type-aliases/ErrorData.md)
- [HttpMethod](type-aliases/HttpMethod.md)
- [InteractionActionInput](type-aliases/InteractionActionInput.md)
- [InteractionActionMetaResolver](type-aliases/InteractionActionMetaResolver.md)
- [InteractionActionsRecord](type-aliases/InteractionActionsRecord.md)
- [InteractionActionsRuntime](type-aliases/InteractionActionsRuntime.md)
- [InteractivityServerState](type-aliases/InteractivityServerState.md)
- [InteractivityServerStateResolver](type-aliases/InteractivityServerStateResolver.md)
- [InteractivityStoreResult](type-aliases/InteractivityStoreResult.md)
- [InvalidateOptions](type-aliases/InvalidateOptions.md)
- [ListResponse](type-aliases/ListResponse.md)
- [NamespaceDetectionMode](type-aliases/NamespaceDetectionMode.md)
- [NamespaceDetectionOptions](type-aliases/NamespaceDetectionOptions.md)
- [NamespaceDetectionResult](type-aliases/NamespaceDetectionResult.md)
- [NamespaceRuntimeContext](type-aliases/NamespaceRuntimeContext.md)
- [NoticeStatus](type-aliases/NoticeStatus.md)
- [ParamsOf](type-aliases/ParamsOf.md)
- [PathParams](type-aliases/PathParams.md)
- [Reporter](type-aliases/Reporter.md)
- [ReporterLevel](type-aliases/ReporterLevel.md)
- [ReporterOptions](type-aliases/ReporterOptions.md)
- [ResourceActions](type-aliases/ResourceActions.md)
- [ResourceClient](type-aliases/ResourceClient.md)
- [ResourceConfig](type-aliases/ResourceConfig.md)
- [ResourceDefinedEvent](type-aliases/ResourceDefinedEvent.md)
- [ResourceErrorEvent](type-aliases/ResourceErrorEvent.md)
- [ResourceIdentityConfig](type-aliases/ResourceIdentityConfig.md)
- [ResourceObject](type-aliases/ResourceObject.md)
- [ResourcePostMetaDescriptor](type-aliases/ResourcePostMetaDescriptor.md)
- [ResourceQueryParamDescriptor](type-aliases/ResourceQueryParamDescriptor.md)
- [ResourceQueryParams](type-aliases/ResourceQueryParams.md)
- [ResourceRequestEvent](type-aliases/ResourceRequestEvent.md)
- [ResourceResolvers](type-aliases/ResourceResolvers.md)
- [ResourceResponseEvent](type-aliases/ResourceResponseEvent.md)
- [ResourceRoute](type-aliases/ResourceRoute.md)
- [ResourceRoutes](type-aliases/ResourceRoutes.md)
- [ResourceSelectors](type-aliases/ResourceSelectors.md)
- [ResourceState](type-aliases/ResourceState.md)
- [ResourceStorageConfig](type-aliases/ResourceStorageConfig.md)
- [ResourceStore](type-aliases/ResourceStore.md)
- [ResourceStoreConfig](type-aliases/ResourceStoreConfig.md)
- [ResourceStoreOptions](type-aliases/ResourceStoreOptions.md)
- [SerializedError](type-aliases/SerializedError.md)
- [TransportMeta](type-aliases/TransportMeta.md)
- [TransportRequest](type-aliases/TransportRequest.md)
- [TransportResponse](type-aliases/TransportResponse.md)
- [WaitOptions](type-aliases/WaitOptions.md)
- [WPKernelEventMap](type-aliases/WPKernelEventMap.md)
- [WPKernelRegistry](type-aliases/WPKernelRegistry.md)
- [WPKernelUIAttach](type-aliases/WPKernelUIAttach.md)

## Variables

- [getWPData](variables/getWPData.md)
- [VERSION](variables/VERSION.md)
- [WPK_CONFIG_SOURCES](variables/WPK_CONFIG_SOURCES.md)
- [WPK_EVENTS](variables/WPK_EVENTS.md)
- [WPK_INFRASTRUCTURE](variables/WPK_INFRASTRUCTURE.md)
- [WPK_NAMESPACE](variables/WPK_NAMESPACE.md)
- [WPK_SUBSYSTEM_NAMESPACES](variables/WPK_SUBSYSTEM_NAMESPACES.md)

## Functions

### Actions

- [createActionMiddleware](functions/createActionMiddleware.md)
- [defineAction](functions/defineAction.md)
- [invokeAction](functions/invokeAction.md)

### Capability

- [createCapabilityProxy](functions/createCapabilityProxy.md)
- [defineCapability](functions/defineCapability.md)

### Data

- [configureWPKernel](functions/configureWPKernel.md)
- [registerWPKernelStore](functions/registerWPKernelStore.md)
- [wpkEventsPlugin](functions/wpkEventsPlugin.md)

### Events

- [clearRegisteredActions](functions/clearRegisteredActions.md)
- [clearRegisteredResources](functions/clearRegisteredResources.md)
- [getRegisteredActions](functions/getRegisteredActions.md)
- [getRegisteredResources](functions/getRegisteredResources.md)
- [getWPKernelEventBus](functions/getWPKernelEventBus.md)
- [setWPKernelEventBus](functions/setWPKernelEventBus.md)

### HTTP

- [fetch](functions/fetch.md)

### Interactivity

- [defineInteraction](functions/defineInteraction.md)

### Namespace

- [detectNamespace](functions/detectNamespace.md)
- [getNamespace](functions/getNamespace.md)
- [isValidNamespace](functions/isValidNamespace.md)
- [sanitizeNamespace](functions/sanitizeNamespace.md)

### Reporter

- [clearWPKReporter](functions/clearWPKReporter.md)
- [createNoopReporter](functions/createNoopReporter.md)
- [createReporter](functions/createReporter.md)
- [getWPKernelReporter](functions/getWPKernelReporter.md)
- [setWPKernelReporter](functions/setWPKernelReporter.md)

### Resource

- [createStore](functions/createStore.md)
- [defineResource](functions/defineResource.md)
- [interpolatePath](functions/interpolatePath.md)
- [invalidate](functions/invalidate.md)
- [normalizeCacheKey](functions/normalizeCacheKey.md)

## References

### ACTION_LIFECYCLE_PHASES

Re-exports [ACTION_LIFECYCLE_PHASES](namespaces/contracts/variables/ACTION_LIFECYCLE_PHASES.md)

---

### ActionLifecyclePhase

Re-exports [ActionLifecyclePhase](namespaces/contracts/type-aliases/ActionLifecyclePhase.md)

---

### serializeWPKernelError

Re-exports [serializeWPKernelError](namespaces/contracts/functions/serializeWPKernelError.md)

---

### WPK_EXIT_CODES

Re-exports [WPK_EXIT_CODES](namespaces/contracts/variables/WPK_EXIT_CODES.md)

---

### WPKernelUIRuntime

Re-exports [WPKernelUIRuntime](@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)

---

### WPKExitCode

Re-exports [WPKExitCode](namespaces/contracts/type-aliases/WPKExitCode.md)
