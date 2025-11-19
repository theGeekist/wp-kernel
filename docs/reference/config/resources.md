# Resource Configuration

Every WPKernel project lives on a bedrock of **resources**. A resource describes a slice of your domain — “job”, “order”, “subscription” — and the config under `resources.<key>` tells WPKernel how that slice behaves across PHP, REST, JS, and (optionally) admin UI.

This page walks through each resource property in depth. The headings match the config paths so the built-in VitePress outline and search work as you’d expect.

## `resources.<key>.namespace`

Most projects share a single top-level `namespace` at the root of `wpk.config.ts`. Occasionally you need to bend that rule: a plugin that bundles two logical modules, a migration where one resource has to keep its legacy prefix, or a shared WordPress instance where your plugin straddles multiple domains.

`resources.<key>.namespace` lets you override the root namespace **for one resource only**.

When you set it, three things happen:

- **PHP controllers and helpers**: the generated PHP namespace for that resource’s code switches to the override, so you can keep classes under `Generated\LegacyModule\…` even if the project namespace has moved on.
- **REST routes**: the REST namespace used for that resource’s routes derives from the override, so you can mount a resource under `/legacy/v1/...` while everything else uses `/acme/v1/...`.
- **Client/runtime metadata**: stores, capability unions, and reporter labels use the override when they derive their `namespace/resource` keys.

If you don’t set `resources.<key>.namespace`, the resource simply inherits the root `namespace` and moves in lockstep with the rest of the project when you rename it.

## `resources.<key>.routes`

Routes are where a resource becomes visible to the outside world. Under `resources.<key>.routes` you describe which HTTP operations the resource supports and how they’re exposed in REST.

The common pattern is a partial CRUD map:

- `list` – collection endpoint (typically `GET /<namespace>/v1/<resource>`).
- `get` – single-item endpoint (`GET /<namespace>/v1/<resource>/:id`).
- `create` – mutation endpoint (`POST /…`).
- `update` – mutation endpoint (`PUT` or `PATCH /…`).
- `remove` – deletion endpoint (`DELETE /…`).

Each route entry has a few core fields:

- **`path`** – required when the route is present. It may include parameters like `:id`, `:slug`, or any other segment your identity and storage model expects.
- **`method`** – HTTP verb for the route. Must be one of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **`capability`** – optional capability key that links to `resources.<key>.capabilities`. You can leave it out during early development; the generator will emit a warning and fall back to a safe default (`manage_options`) so you still get working endpoints.

From this map WPKernel does the heavy lifting:

- Generates REST controllers with one handler per route.
- Registers those routes via `register_rest_route()`, using your `path` and `method`.
- Emits a typed API client with methods like `fetchList`, `fetch`, `create`, `update`, and `remove`, wired to the same routes.
- Threads capability hints into both the PHP side (permission callbacks) and the JS side (capability unions and helpers).

You can start with just `list` and `get`, add `create`/`update`/`remove` as the domain solidifies, and later introduce custom routes through the same pattern when your resource outgrows basic CRUD.

## `resources.<key>.identity`

Identity tells WPKernel how to talk about “one specific thing” for this resource. Is that thing identified by a numeric ID? A slug? A UUID? The answer influences REST arguments, PHP casting, cache keys, and even DataView row IDs.

By default, WPKernel assumes numeric IDs:

- `type: "number"`
- `param: "id"`

So if you don’t configure anything, generated handlers will expect an `id` parameter and cast it to an integer before touching storage.

When you need something else, you can be explicit:

- For slugs: `{ type: "string", param: "slug" }`
- For UUID-style IDs: `{ type: "string", param: "uuid" }`
- For custom patterns: `{ type: "string", param: "id" }` (with validation pushed into your schema and handlers)

This identity metadata flows into:

- **REST controllers** – the right parameter is marked as required and cast/sanitised appropriately before your handler runs.
- **Cache helpers** – generated cache keys include the identity type, so `"42"` vs `42` and `/slug/foo` vs `/id/foo` don’t collide.
- **UI/DataViews** – row identifiers and selection helpers use the same identity shape, so selection state remains stable and predictable.

Importantly, `identity` does **not** create or alter database fields by itself. It only describes how the resource is addressed at the API boundary; your storage configuration decides where the data ultimately lives.

## `resources.<key>.storage`

Storage describes how a resource persists data inside WordPress. It does **not** create tables for you; instead, it wraps the storage primitives WordPress already exposes.

You choose one of the supported modes:

- `mode: "wp-post"` – model a custom post type or reuse an existing one.
- `mode: "wp-taxonomy"` – work with taxonomy terms as the primary object.
- `mode: "wp-option"` – treat a single option as this resource’s backing store.
- `mode: "transient"` – store ephemeral data in a transient.

Each mode adds its own set of fields:

- **`wp-post`**:
    - `postType` – the slug of the post type to manage; if omitted you can still hook into existing types.
    - `statuses` – which statuses are considered when listing (e.g. `["publish", "draft"]`).
    - `supports` – which core post features (`title`, `editor`, etc.) are relevant to this resource.
    - `meta` – a map of meta keys to descriptors, used for type-safe meta sync.
    - `taxonomies` – a map of taxonomy descriptors (`taxonomy`, `hierarchical`, `register`) to define term relationships.

- **`wp-taxonomy`**:
    - `taxonomy` – the taxonomy slug this resource owns.
    - `hierarchical` – whether the taxonomy behaves like categories (`true`) or tags (`false`).

- **`wp-option`**:
    - `option` – the option name this resource reads and writes.

- **`transient`**:
    - No extra fields; the resource’s identity drives which transient key is used.

From this configuration WPKernel:

- Generates CRUD helpers tailored to each storage mode.
- Emits controller scaffolding that calls the right WordPress APIs (`get_post()`, `wp_insert_post()`, `get_option()`, `update_option()`, `get_transient()`, etc.).
- Uses `meta` and `taxonomies` descriptors to generate sync helpers that keep REST responses and stored data in step.

When `resources.<key>.schema` is set to `"auto"`, this storage metadata also becomes the raw material for deriving a JSON Schema, so your REST handlers and clients reflect the shape of what you actually store.

## `resources.<key>.schema`

Schema bindings tell WPKernel how to validate and document the shape of the data that flows through this resource.

You have three main ways to express that relationship:

1. **Point to a named schema**  
   Use a string key that matches an entry in the top-level `schemas` map:

    ````ts
    schema: 'job'
    	```
    This keeps the schema definition centralised and lets multiple resources share the same shape.
    ````

2. Inline a JSON Schema object
   Define the schema directly inside the resource:

    ```ts
    schema: {
      $id: 'Job',
      type: 'object',
      properties: { /* … */ },
    }
    ```

    Inline objects are hashed and deduplicated internally, so if two resources share the same inline schema they end up referencing the same internal key.

3. Ask WPKernel to derive one
   Set schema: "auto" and WPKernel will synthesise a schema from your storage metadata where possible (e.g. post meta descriptors). This is useful when you want JSON Schema-driven validation without hand-authoring every property.

    You can also leave schema as undefined, which means “no JSON Schema for this resource”. In that case WPKernel still emits controllers and clients, but they do not rely on schema-driven argument validation.

    Where schemas are wired, they feed into:
    • REST argument metadata – WordPress gets a richer picture of fields, types, and constraints for request payloads.
    • Future type emitters – TypeScript definitions can be generated from the same schemas, keeping compile-time and runtime validation in step.
    • Runtime metadata – ResourceObject.schemaKey exposes which schema a resource uses so clients can introspect or cross-link docs.

⸻
