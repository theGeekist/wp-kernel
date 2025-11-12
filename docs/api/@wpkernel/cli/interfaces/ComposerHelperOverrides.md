[**@wpkernel/cli v0.12.1-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / ComposerHelperOverrides

# Interface: ComposerHelperOverrides

## Extends

- `Partial`\<[`ComposerHelperDependencies`](ComposerHelperDependencies.md)\>

## Properties

### install()?

```ts
readonly optional install: (cwd, __namedParameters) => Promise<void>;
```

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

[`InstallerDependencies`](InstallerDependencies.md) = `{}`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`ComposerHelperDependencies`](ComposerHelperDependencies.md).[`install`](ComposerHelperDependencies.md#install)

---

### installOnPending?

```ts
readonly optional installOnPending: boolean;
```

---

### pathExists()?

```ts
readonly optional pathExists: (candidate) => Promise<boolean>;
```

#### Parameters

##### candidate

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`ComposerHelperDependencies`](ComposerHelperDependencies.md).[`pathExists`](ComposerHelperDependencies.md#pathexists)

---

### resolveCliComposerRoot()?

```ts
readonly optional resolveCliComposerRoot: () => string | null;
```

#### Returns

`string` \| `null`

#### Inherited from

[`ComposerHelperDependencies`](ComposerHelperDependencies.md).[`resolveCliComposerRoot`](ComposerHelperDependencies.md#resolveclicomposerroot)

---

### showPhpParserMetadata()?

```ts
readonly optional showPhpParserMetadata: (cwd) => Promise<ComposerShowResult>;
```

#### Parameters

##### cwd

`string`

#### Returns

`Promise`\<`ComposerShowResult`\>

#### Inherited from

[`ComposerHelperDependencies`](ComposerHelperDependencies.md).[`showPhpParserMetadata`](ComposerHelperDependencies.md#showphpparsermetadata)
