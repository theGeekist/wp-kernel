[**@wpkernel/cli v0.12.1-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / ComposerHelperDependencies

# Interface: ComposerHelperDependencies

## Properties

### install()

```ts
readonly install: (cwd, __namedParameters) => Promise<void>;
```

#### Parameters

##### cwd

`string`

##### \_\_namedParameters

[`InstallerDependencies`](InstallerDependencies.md) = `{}`

#### Returns

`Promise`\<`void`\>

---

### pathExists()

```ts
readonly pathExists: (candidate) => Promise<boolean>;
```

#### Parameters

##### candidate

`string`

#### Returns

`Promise`\<`boolean`\>

---

### resolveCliComposerRoot()

```ts
readonly resolveCliComposerRoot: () => string | null;
```

#### Returns

`string` \| `null`

---

### showPhpParserMetadata()

```ts
readonly showPhpParserMetadata: (cwd) => Promise<ComposerShowResult>;
```

#### Parameters

##### cwd

`string`

#### Returns

`Promise`\<`ComposerShowResult`\>
