[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / BuildInitCommandOptions

# Interface: BuildInitCommandOptions

## Properties

### Other

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### checkGitRepository()?

```ts
readonly optional checkGitRepository: (cwd, __namedParameters) => Promise<boolean>;
```

##### Parameters

###### cwd

`string`

###### \_\_namedParameters

`GitDependencies` = `{}`

##### Returns

`Promise`\&lt;`boolean`\&gt;

---

#### runWorkflow()?

```ts
readonly optional runWorkflow: (__namedParameters) => Promise<InitWorkflowResult>;
```

##### Parameters

###### \_\_namedParameters

`InitWorkflowOptions`

##### Returns

`Promise`\&lt;`InitWorkflowResult`\&gt;

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Create a kernel reporter backed by LogLayer transports.

The reporter honors namespace, channel, and level options while providing a
typed interface for child loggers used across subsystems.

##### Parameters

###### options

[`ReporterOptions`](../../../../../core/src/type-aliases/ReporterOptions.md) = `{}`

Reporter configuration

##### Returns

[`Reporter`](../../../../../core/src/type-aliases/Reporter.md)

Reporter instance with child helpers
