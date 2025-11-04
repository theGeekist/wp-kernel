[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / BuildLoadedConfigOptions

# Interface: BuildLoadedConfigOptions\&lt;TConfig, TOrigin, TComposerCheck\&gt;

Options for building a loaded kernel configuration.

## Type Parameters

### TConfig

`TConfig` *extends* [`WPKConfigV1Like`](WPKConfigV1Like.md) = [`WPKConfigV1Like`](WPKConfigV1Like.md)

### TOrigin

`TOrigin` *extends* `string` = `string`

### TComposerCheck

`TComposerCheck` *extends* `string` = `string`

## Properties

### config?

```ts
readonly optional config: TConfig;
```

The kernel configuration object.

***

### namespace?

```ts
readonly optional namespace: string;
```

The namespace of the project.

***

### sourcePath?

```ts
readonly optional sourcePath: string;
```

The source path of the configuration file.

***

### configOrigin?

```ts
readonly optional configOrigin: TOrigin;
```

The origin of the configuration (e.g., 'project', 'workspace').

***

### composerCheck?

```ts
readonly optional composerCheck: TComposerCheck;
```

The composer check status.
