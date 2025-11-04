[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / createReporter

# Function: createReporter()

```ts
function createReporter(options): Reporter;
```

Create a WP Kernel reporter backed by LogLayer transports.

The reporter honors namespace, channel, and level options while providing a
typed interface for child loggers used across subsystems.

## Parameters

### options

[`ReporterOptions`](../type-aliases/ReporterOptions.md) = `{}`

Reporter configuration

## Returns

[`Reporter`](../type-aliases/Reporter.md)

Reporter instance with child helpers
