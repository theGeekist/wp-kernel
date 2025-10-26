[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / runCli

# Function: runCli()

```ts
function runCli(argv): Promise<void>;
```

Run the WP Kernel CLI programmatically.

This convenience function mirrors the behavior of the shipped `wpk`
binary but is safe to call from scripts or tests. It accepts an argv
array (defaults to process.argv slice(2)) and forwards stdio streams to
the underlying Clipanion CLI instance.

## Parameters

### argv

`string`[] = `...`

Command-line arguments (without the node and script path)

## Returns

`Promise`\&lt;`void`\&gt;

A promise that resolves when the CLI invocation completes.

## Example

```ts
// programmatic invocation from a script
await runCli(['generate', 'resource', '--name', 'post']);
```
