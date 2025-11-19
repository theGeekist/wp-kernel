# Schemas

Registry of shared schema descriptors keyed by identifier. Each entry:

- `path`: relative path to the source schema (e.g., JSON Schema/Zod)
- `generated.types`: relative path for generated TypeScript types
- `description?`: optional narrative

Required in the config but may be empty. Builders load these into the schema accumulator for REST arg validation. See [schemas in appendix](/reference/config/appendix#schemas).
