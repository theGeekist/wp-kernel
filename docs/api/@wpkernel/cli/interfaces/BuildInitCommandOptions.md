[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / BuildInitCommandOptions

# Interface: BuildInitCommandOptions

Options for building the `init` command.

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) =&gt; Reporter;
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

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) =&gt; Workspace;
```

Optional: Custom workspace builder function.

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### runWorkflow()?

```ts
readonly optional runWorkflow: (__namedParameters) =&gt; Promise&lt;InitWorkflowResult&gt;;
```

Optional: Custom workflow runner function.

##### Parameters

###### \_\_namedParameters

[`InitWorkflowOptions`](InitWorkflowOptions.md)

##### Returns

`Promise`\&lt;[`InitWorkflowResult`](InitWorkflowResult.md)\&gt;

---

#### checkGitRepository()?

```ts
readonly optional checkGitRepository: (cwd, __namedParameters) =&gt; Promise&lt;boolean&gt;;
```

Optional: Custom git repository checker function.

##### Parameters

###### cwd

`string`

###### \_\_namedParameters

[`GitDependencies`](GitDependencies.md) = `{}`

##### Returns

`Promise`\&lt;`boolean`\&gt;
