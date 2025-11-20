# Schema Registry (`schemas`)

The `schemas` object in `wpk.config.ts` is where you declare the data models your project relies on. Each entry maps a key (e.g. `"job"`, `"product"`, `"profile"`) to a JSON Schema file that describes the structure of that entity. Once registered, WPKernel treats these schemas as truth: they shape request validation, runtime metadata, and - over time - the TypeScript types you consume in your client code.

Even though schema-driven type emission is only partially active today, the registry already plays three important roles:

- **Validation** — REST controllers automatically reuse schema property metadata when validating request bodies and query parameters.
- **Metadata** — Schema information is embedded into the Internal Representation (IR), allowing clients to introspect the expected shape at runtime.
- **Forward compatibility** — The registry is designed to power schema-to-TypeScript emission (`*.d.ts`) when the builder lands, ensuring compile-time and runtime alignment.

Schemas can be referenced explicitly from a resource (`resources.<key>.schema: 'job'`), supplied inline (WPKernel hashes and deduplicates), or synthesised automatically from storage metadata (`resources.<key>.storage`).
This page documents the fields used in the _schema registry itself_.

---

## `schemas.<key>.path`

This is the canonical path to the schema file for the registry entry identified by `<key>`.

- **What it does**
  Points to a JSON Schema file - usually a `.json`, but a `.ts` export also works. WPKernel loads its contents, hashes it, and stores the schema in the IR.

- **Where it’s used**
    - The CLI resolves and validates the schema when assembling the IR.
    - REST controllers reuse property metadata for validation (`type`, `enum`, `required`, etc.).
    - Client-side runtime metadata contains the schema key and its shape, so tools can introspect it.
    - Inline schemas referenced on resources are deduplicated by hashing against these paths.

- **Resolution rules**
  The path is resolved relative to the location of your `wpk.config.ts` file or the workspace root.

**Schema:**

- **Type:** `string`
- **Required:** Yes
- **Minimum length:** 1

---

## `schemas.<key>.generated.types`

This path defines where WPKernel _will_ emit TypeScript type definitions derived from your schema.
While type-emission is not active yet, the configuration is real and stored in the IR, ensuring your project is future-proof.

- **What it does**
  Declares the output location for schema-based `*.d.ts` files (e.g. `"./.generated/types/job.d.ts"`).

- **Where it’s used**
    - Recorded in the IR for the future schema-to-TypeScript emitter.
    - Allows builders and tooling to know where types _should_ live even before the system begins generating them.

- **Current behaviour**
  No files are written today. This field is forward-looking but must still be supplied.

**Schema:**

- **Type:** `string`
- **Required:** Yes
- **Minimum length:** 1

---

## `schemas.<key>.description`

A simple human-readable description of what the schema represents.

- **What it does**
  Captures a short explanation of the model - useful for documentation, tooling, and future introspection.

- **Where it’s used**
    - Kept in the IR as metadata.
    - Exposed to documentation generators and internal tools.
    - Does not currently influence validation or generation.

**Schema:**

- **Type:** `string`
- **Required:** No
- **Minimum length:** 1
