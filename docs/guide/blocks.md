# Blocks

Blocks are the public face of your plugin. WP Kernel treats them as first-class citizens: the CLI discovers block manifests, generates registration code for JS-only blocks, and emits PHP registrars for SSR blocks.【F:packages/cli/src/builders/ts/blocks.ts†L1-L180】【F:packages/cli/src/builders/php/blocks/index.ts†L1-L120】

## Authoring a block

Place each block under `blocks/<name>/` with a `block.json` manifest. The CLI reads the manifest when generating registrars and keeps it tied to the kernel namespace.

```json
{
	"apiVersion": 3,
	"name": "acme/job-listing",
	"title": "Job Listing",
	"category": "widgets",
	"textdomain": "acme",
	"editorScriptModule": "file:./index.tsx",
	"viewScriptModule": "file:./view.ts"
}
```

When the manifest omits a render callback the JS-only builder writes `.generated/blocks/auto-register.ts` with `registerBlockType()` calls for every discovered block.【F:packages/cli/src/builders/ts/blocks.ts†L200-L360】 Import that file from your entry point so WordPress can register the block.

## Server-rendered blocks

Add `render.php` alongside the manifest when a block needs SSR-for SEO or privileged data. The CLI detects it, generates `.generated/php/Blocks/<Block>.php`, and wires a registrar that defers to your renderer. The PHP helper loads WordPress data by calling into the generated persistence layer, so you can reuse the same resource contracts on the server.【F:packages/cli/src/builders/php/blocks/index.ts†L1-L160】【F:packages/cli/src/builders/php/resourceController.ts†L1-L220】

The generated registrar expects a PHP callback that receives block attributes, content, and context. Keep that callback thin: pull data through the generated controllers or resource helpers so the behaviour stays aligned with the config. The SSR builder writes guards that call into the persistence registry and mirrors the structure exercised in the SSR block tests.【F:packages/cli/src/builders/php/**tests**/blocks.test.ts†L1-L200】

## Script modules and assets

Blocks ship as Script Modules. Vite handles bundling, and the CLI writes a registrar that enqueues the correct assets when `wpk apply` runs. If you need additional styles, add `style.css` in the block folder; Vite will include it in the build manifest that the registrar consumes.【F:packages/cli/src/builders/php/blocks/registrar/index.ts†L1-L160】

## Surfacing resource data

For list-style screens, combine blocks with the UI runtime. In the showcase example the DataViews screen uses `<ResourceDataView>` to display jobs while the PHP layer exposes controllers under `inc/Rest/**` for server usage.【F:examples/showcase/src/views/admin/JobsList.tsx†L1-L200】【F:examples/showcase/inc/Rest/JobController.php†L1-L200】

## Video tour

> 🎬 _Coming soon: 45-second clip comparing SSR blocks and JS-only registration._

## Further reading

- [Resources guide](/guide/resources) - resources power block data on both the client and the server.
- [Showcase example](/examples/showcase) - see SSR and UI bindings working together.
- [`/api/ui/`](../api/) - generated Typedoc for UI helpers.
