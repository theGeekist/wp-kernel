[**WP Kernel API v0.8.0**](../../README.md)

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

- [actions](namespaces/actions/README.md)
- [contracts](namespaces/contracts/README.md)
- [error](namespaces/error/README.md)
- [@wpkernel/core/events](namespaces/@wpkernel/core/events/README.md)
- [http](namespaces/http/README.md)
- [namespace](namespaces/namespace/README.md)
- [pipeline](namespaces/pipeline/README.md)
- [policy](namespaces/policy/README.md)
- [resource](namespaces/resource/README.md)

## Classes

- [ServerError](classes/ServerError.md)
- [TransportError](classes/TransportError.md)
- [WPKernelError](classes/WPKernelError.md)
- [WPKernelEventBus](classes/WPKernelEventBus.md)

## Interfaces

- [WPKUIConfig](interfaces/WPKUIConfig.md)
- [ConfigureWPKernelOptions](interfaces/ConfigureWPKernelOptions.md)
- [UIIntegrationOptions](interfaces/UIIntegrationOptions.md)
- [WPKUIPolicyRuntime](interfaces/WPKUIPolicyRuntime.md)
- [WPKInstance](interfaces/WPKInstance.md)
- [ResourceDataViewsMenuConfig](interfaces/ResourceDataViewsMenuConfig.md)
- [ResourceDataViewsScreenConfig](interfaces/ResourceDataViewsScreenConfig.md)
- [ResourceDataViewsUIConfig](interfaces/ResourceDataViewsUIConfig.md)
- [ResourceAdminUIConfig](interfaces/ResourceAdminUIConfig.md)
- [ResourceUIConfig](interfaces/ResourceUIConfig.md)

## Type Aliases

- [ActionOptions](type-aliases/ActionOptions.md)
- [WaitOptions](type-aliases/WaitOptions.md)
- [ActionJobs](type-aliases/ActionJobs.md)
- [ActionStartEvent](type-aliases/ActionStartEvent.md)
- [ActionCompleteEvent](type-aliases/ActionCompleteEvent.md)
- [ActionErrorEvent](type-aliases/ActionErrorEvent.md)
- [ActionLifecycleEvent](type-aliases/ActionLifecycleEvent.md)
- [ActionContext](type-aliases/ActionContext.md)
- [ActionFn](type-aliases/ActionFn.md)
- [ActionConfig](type-aliases/ActionConfig.md)
- [DefinedAction](type-aliases/DefinedAction.md)
- [NoticeStatus](type-aliases/NoticeStatus.md)
- [WPKernelRegistry](type-aliases/WPKernelRegistry.md)
- [WPKernelUIAttach](type-aliases/WPKernelUIAttach.md)
- [ErrorCode](type-aliases/ErrorCode.md)
- [ErrorContext](type-aliases/ErrorContext.md)
- [ErrorData](type-aliases/ErrorData.md)
- [SerializedError](type-aliases/SerializedError.md)
- [ResourceDefinedEvent](type-aliases/ResourceDefinedEvent.md)
- [ActionDefinedEvent](type-aliases/ActionDefinedEvent.md)
- [ActionDomainEvent](type-aliases/ActionDomainEvent.md)
- [CacheInvalidatedEvent](type-aliases/CacheInvalidatedEvent.md)
- [CustomKernelEvent](type-aliases/CustomKernelEvent.md)
- [WPKernelEventMap](type-aliases/WPKernelEventMap.md)
- [HttpMethod](type-aliases/HttpMethod.md)
- [TransportMeta](type-aliases/TransportMeta.md)
- [TransportRequest](type-aliases/TransportRequest.md)
- [TransportResponse](type-aliases/TransportResponse.md)
- [ResourceRequestEvent](type-aliases/ResourceRequestEvent.md)
- [ResourceResponseEvent](type-aliases/ResourceResponseEvent.md)
- [ResourceErrorEvent](type-aliases/ResourceErrorEvent.md)
- [NamespaceDetectionMode](type-aliases/NamespaceDetectionMode.md)
- [NamespaceRuntimeContext](type-aliases/NamespaceRuntimeContext.md)
- [NamespaceDetectionOptions](type-aliases/NamespaceDetectionOptions.md)
- [NamespaceDetectionResult](type-aliases/NamespaceDetectionResult.md)
- [PolicyReporter](type-aliases/PolicyReporter.md)
- [PolicyRule](type-aliases/PolicyRule.md)
- [PolicyMap](type-aliases/PolicyMap.md)
- [ParamsOf](type-aliases/ParamsOf.md)
- [PolicyCacheOptions](type-aliases/PolicyCacheOptions.md)
- [PolicyCache](type-aliases/PolicyCache.md)
- [PolicyContext](type-aliases/PolicyContext.md)
- [PolicyOptions](type-aliases/PolicyOptions.md)
- [PolicyDefinitionConfig](type-aliases/PolicyDefinitionConfig.md)
- [PolicyHelpers](type-aliases/PolicyHelpers.md)
- [PolicyDeniedEvent](type-aliases/PolicyDeniedEvent.md)
- [ReporterLevel](type-aliases/ReporterLevel.md)
- [ReporterOptions](type-aliases/ReporterOptions.md)
- [Reporter](type-aliases/Reporter.md)
- [CacheKeyPattern](type-aliases/CacheKeyPattern.md)
- [PathParams](type-aliases/PathParams.md)
- [InvalidateOptions](type-aliases/InvalidateOptions.md)
- [ResourceRoute](type-aliases/ResourceRoute.md)
- [ResourceIdentityConfig](type-aliases/ResourceIdentityConfig.md)
- [ResourcePostMetaDescriptor](type-aliases/ResourcePostMetaDescriptor.md)
- [ResourceStorageConfig](type-aliases/ResourceStorageConfig.md)
- [ResourceRoutes](type-aliases/ResourceRoutes.md)
- [CacheKeyFn](type-aliases/CacheKeyFn.md)
- [CacheKeys](type-aliases/CacheKeys.md)
- [ResourceQueryParamDescriptor](type-aliases/ResourceQueryParamDescriptor.md)
- [ResourceQueryParams](type-aliases/ResourceQueryParams.md)
- [ResourceStoreOptions](type-aliases/ResourceStoreOptions.md)
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

## Variables

- [VERSION](variables/VERSION.md)
- [getWPData](variables/getWPData.md)
- [WPK_NAMESPACE](variables/WPK_NAMESPACE.md)
- [WPK_SUBSYSTEM_NAMESPACES](variables/WPK_SUBSYSTEM_NAMESPACES.md)
- [WPK_INFRASTRUCTURE](variables/WPK_INFRASTRUCTURE.md)
- [WPK_EVENTS](variables/WPK_EVENTS.md)
- [WPK_CONFIG_SOURCES](variables/WPK_CONFIG_SOURCES.md)

## Functions

- [defineAction](functions/defineAction.md)
- [createActionMiddleware](functions/createActionMiddleware.md)
- [invokeAction](functions/invokeAction.md)
- [configureWPKernel](functions/configureWPKernel.md)
- [wpkEventsPlugin](functions/wpkEventsPlugin.md)
- [registerWPKernelStore](functions/registerWPKernelStore.md)
- [getWPKernelEventBus](functions/getWPKernelEventBus.md)
- [setWPKernelEventBus](functions/setWPKernelEventBus.md)
- [getRegisteredResources](functions/getRegisteredResources.md)
- [getRegisteredActions](functions/getRegisteredActions.md)
- [clearRegisteredResources](functions/clearRegisteredResources.md)
- [clearRegisteredActions](functions/clearRegisteredActions.md)
- [fetch](functions/fetch.md)
- [sanitizeNamespace](functions/sanitizeNamespace.md)
- [detectNamespace](functions/detectNamespace.md)
- [getNamespace](functions/getNamespace.md)
- [isValidNamespace](functions/isValidNamespace.md)
- [createPolicyProxy](functions/createPolicyProxy.md)
- [definePolicy](functions/definePolicy.md)
- [setWPKernelReporter](functions/setWPKernelReporter.md)
- [getWPKernelReporter](functions/getWPKernelReporter.md)
- [clearWPKReporter](functions/clearWPKReporter.md)
- [createReporter](functions/createReporter.md)
- [createNoopReporter](functions/createNoopReporter.md)
- [normalizeCacheKey](functions/normalizeCacheKey.md)
- [interpolatePath](functions/interpolatePath.md)
- [invalidate](functions/invalidate.md)
- [defineResource](functions/defineResource.md)
- [createStore](functions/createStore.md)

## References

### ACTION_LIFECYCLE_PHASES

Re-exports [ACTION_LIFECYCLE_PHASES](namespaces/contracts/variables/ACTION_LIFECYCLE_PHASES.md)

---

### WPK_EXIT_CODES

Re-exports [WPK_EXIT_CODES](namespaces/contracts/variables/WPK_EXIT_CODES.md)

---

### serializeWPKernelError

Re-exports [serializeWPKernelError](namespaces/contracts/functions/serializeWPKernelError.md)

---

### ActionLifecyclePhase

Re-exports [ActionLifecyclePhase](namespaces/contracts/type-aliases/ActionLifecyclePhase.md)

---

### WPKExitCode

Re-exports [WPKExitCode](namespaces/contracts/type-aliases/WPKExitCode.md)

---

### WPKernelUIRuntime

Re-exports [WPKernelUIRuntime](@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)
