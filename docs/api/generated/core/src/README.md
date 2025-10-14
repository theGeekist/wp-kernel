[**WP Kernel API v0.3.0**](../../README.md)

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
import { KernelError } from '@wpkernel/core/error';
```

```ts
import { http, resource, error } from '@wpkernel/core';
await http.fetch({ path: '/my-plugin/v1/things' });
resource.defineResource({ name: 'thing', routes: {...} });
throw new error.KernelError('ValidationError', {...});
```

```ts
import { fetch, defineResource, KernelError } from '@wpkernel/core';
```

## Modules

- [@wpkernel/core/data](@wpkernel/core/data/README.md)

## Namespaces

- [actions](namespaces/actions/README.md)
- [error](namespaces/error/README.md)
- [@wpkernel/core/events](namespaces/@wpkernel/core/events/README.md)
- [http](namespaces/http/README.md)
- [namespace](namespaces/namespace/README.md)
- [policy](namespaces/policy/README.md)
- [resource](namespaces/resource/README.md)

## Classes

- [KernelError](classes/KernelError.md)
- [ServerError](classes/ServerError.md)
- [TransportError](classes/TransportError.md)
- [KernelEventBus](classes/KernelEventBus.md)

## Interfaces

- [KernelUIConfig](interfaces/KernelUIConfig.md)
- [ConfigureKernelOptions](interfaces/ConfigureKernelOptions.md)
- [UIIntegrationOptions](interfaces/UIIntegrationOptions.md)
- [KernelUIPolicyRuntime](interfaces/KernelUIPolicyRuntime.md)
- [KernelInstance](interfaces/KernelInstance.md)
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
- [KernelRegistry](type-aliases/KernelRegistry.md)
- [KernelUIAttach](type-aliases/KernelUIAttach.md)
- [ErrorCode](type-aliases/ErrorCode.md)
- [ErrorContext](type-aliases/ErrorContext.md)
- [ErrorData](type-aliases/ErrorData.md)
- [SerializedError](type-aliases/SerializedError.md)
- [ResourceDefinedEvent](type-aliases/ResourceDefinedEvent.md)
- [ActionDefinedEvent](type-aliases/ActionDefinedEvent.md)
- [ActionDomainEvent](type-aliases/ActionDomainEvent.md)
- [CacheInvalidatedEvent](type-aliases/CacheInvalidatedEvent.md)
- [CustomKernelEvent](type-aliases/CustomKernelEvent.md)
- [KernelEventMap](type-aliases/KernelEventMap.md)
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

## Functions

- [defineAction](functions/defineAction.md)
- [createActionMiddleware](functions/createActionMiddleware.md)
- [invokeAction](functions/invokeAction.md)
- [configureKernel](functions/configureKernel.md)
- [kernelEventsPlugin](functions/kernelEventsPlugin.md)
- [registerKernelStore](functions/registerKernelStore.md)
- [getKernelEventBus](functions/getKernelEventBus.md)
- [setKernelEventBus](functions/setKernelEventBus.md)
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
- [setKernelReporter](functions/setKernelReporter.md)
- [getKernelReporter](functions/getKernelReporter.md)
- [clearKernelReporter](functions/clearKernelReporter.md)
- [createReporter](functions/createReporter.md)
- [createNoopReporter](functions/createNoopReporter.md)
- [normalizeCacheKey](functions/normalizeCacheKey.md)
- [interpolatePath](functions/interpolatePath.md)
- [invalidate](functions/invalidate.md)
- [defineResource](functions/defineResource.md)
- [createStore](functions/createStore.md)

## References

### KernelUIRuntime

Re-exports [KernelUIRuntime](@wpkernel/core/data/interfaces/KernelUIRuntime.md)
