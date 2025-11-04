[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / seedPlan

# Function: seedPlan()

```ts
function seedPlan(
   workspace,
   file,
options): Promise&lt;void&gt;;
```

Seeds an apply plan in a given workspace.

## Parameters

### workspace

`string`

The path to the workspace.

### file

`string`

The file name for the plan.

### options

Options for seeding the plan (base content, incoming content, description, current content).

#### base

`string`

#### incoming?

`string` \| `null`

#### description?

`string`

#### current?

`string`

## Returns

`Promise`\&lt;`void`\&gt;

A Promise that resolves when the plan is seeded.
