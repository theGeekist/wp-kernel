[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / BuildLoadedConfigOptions

# Interface: BuildLoadedConfigOptions\<TConfig, TOrigin\>

Options for building a loaded wpk configuration.

## Type Parameters

### TConfig

`TConfig` _extends_ [`WPKConfigV1Like`](WPKConfigV1Like.md) = [`WPKConfigV1Like`](WPKConfigV1Like.md)

### TOrigin

`TOrigin` _extends_ `string` = `string`

## Properties

### config?

```ts
readonly optional config: TConfig;
```

The wpk configuration object.

---

### configOrigin?

```ts
readonly optional configOrigin: TOrigin;
```

The origin of the configuration (e.g., 'project', 'workspace').

---

### namespace?

```ts
readonly optional namespace: string;
```

The namespace of the project.

---

### sourcePath?

```ts
readonly optional sourcePath: string;
```

The source path of the configuration file.
