[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / CapabilityModuleWarning

# Type Alias: CapabilityModuleWarning

```ts
type CapabilityModuleWarning =
	| {
			kind: 'capability-map-warning';
			warning: CapabilityMapWarning;
	  }
	| {
			kind: 'capability-definition-missing';
			capability: string;
			fallbackCapability: string;
			fallbackScope: CapabilityScope;
	  }
	| {
			kind: 'capability-definition-unused';
			capability: string;
			scope?: CapabilityScope;
	  };
```
