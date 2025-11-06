[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildDoctorCommandOptions

# Interface: BuildDoctorCommandOptions

Options for building the `doctor` command, allowing for dependency injection.

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Optional: Custom reporter builder function.

Create a WP Kernel reporter backed by LogLayer transports.

The reporter honors namespace, channel, and level options while providing a
typed interface for child loggers used across subsystems.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

### Other

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

Optional: Custom function to load the WP Kernel configuration.

Locate and load the project's kernel configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure and performs a
Composer autoload sanity check to ensure PHP namespaces are mapped
correctly.

##### Returns

`Promise`\<[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\>

The validated kernel config and associated metadata.

##### Throws

WPKernelError when discovery, parsing or validation fails.

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

Optional: Custom workspace builder function.

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### checkPhpEnvironment()?

```ts
readonly optional checkPhpEnvironment: (options) => Promise<DoctorCheckResult[]>;
```

Optional: Custom function to check the PHP environment.

##### Parameters

###### options

[`CheckPhpEnvironmentOptions`](CheckPhpEnvironmentOptions.md)

##### Returns

`Promise`\<[`DoctorCheckResult`](DoctorCheckResult.md)[]\>

### Workspace Utilities

#### ensureGeneratedPhpClean()?

```ts
readonly optional ensureGeneratedPhpClean: (options) => Promise<void>;
```

Optional: Custom function to ensure the generated PHP directory is clean.

Ensures that the generated PHP directory is clean (i.e., no uncommitted changes).

This function checks the Git status of the specified directory. If uncommitted
changes are found, it throws a `WPKernelError` unless the `yes` option is true.

##### Parameters

###### options

[`EnsureGeneratedPhpCleanOptions`](EnsureGeneratedPhpCleanOptions.md)

Options for the cleanliness check.

##### Returns

`Promise`\<`void`\>

##### Throws

`WPKernelError` if uncommitted changes are found and `yes` is false.
