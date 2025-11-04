[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildPhpIntegrationEnv

# Function: buildPhpIntegrationEnv()

```ts
function buildPhpIntegrationEnv(baseEnv): ProcessEnv;
```

Builds an environment object suitable for running PHP integration tests.

This function sets up `WPK_PHP_AUTOLOAD_PATHS` and `NODE_PATH` environment variables
to ensure PHP and Node.js dependencies are correctly resolved during tests.

## Parameters

### baseEnv

`ProcessEnv` = `process.env`

The base environment variables to extend (defaults to `process.env`).

## Returns

`ProcessEnv`

A new environment object with PHP integration paths configured.
