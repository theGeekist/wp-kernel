Before you begin the following task.

- Please review `./cli-decision-matrix.md`, ensure is in-sync with the code and document differences in this document. The version below is for public consumption only
- Except for Roadmap, there should be no documentation phase/sprint/timing/changelog or version references in `./docs`. We are pre-launch, no need to bloat
- Outdated, but rich docs should be moved to an `./docs/.archived` folder, the rest restructured according to the information below

**WRITING STYLE**: Prefer paragraphs and narratives, like WordPress development docs. Explaining difficult parts, less jargon. Paragraphs > bullets! Long code snippets broken down with explanations.

**Examples** currently showcase seems to be a good example of framework features

## 1) Target site structure (simple, sales-first)

```
docs/
├─ index.md                         # Landing page (what/why, 3 CTAs)
├─ getting-started/
│  ├─ index.md                      # Overview + prerequisites
│  ├─ installation.md               # pnpm add, peer deps, WP env
│  └─ quick-start.md                # `wpk init → generate → apply → start`
├─ examples/
│  ├─ index.md                      # What each example shows (cards)
│  └─ <example-name>/*.md           # One page per example (from examples/*)
├─ guide/
│  ├─ index.md                      # Concepts map (visual)
│  ├─ resources.md                  # Beginner path
│  ├─ actions.md
│  ├─ policy.md
│  ├─ dataviews.md
│  ├─ blocks.md                     # Blocks + SSR + manifest (DX section)
│  ├─ interactivity.md
│  ├─ prefetching.md
│  ├─ reporting.md
│  └─ modes.md                      # Thin client vs rich server
├─ reference/
│  ├─ wpk-config.md              # The root config (commented, canonical)
│  ├─ contracts.md                  # JSON Schema patterns & 'auto' rules
│  ├─ decision-matrix.md            # What gets generated when (concise table)
│  └─ cli-commands.md               # generate/apply/init/start/build/doctor
├─ api/
│  ├─ index.md
│  ├─ cli/…                         # Typedoc for @wpk/cli
│  ├─ core/…                        # Typedoc for @wpk/core
│  └─ ui/…                          # Typedoc for @wpk/ui
├─ contributing/
│  ├─ index.md
│  ├─ setup.md
│  ├─ testing.md
│  ├─ e2e-testing.md
│  ├─ runbook.md
│  └─ roadmap.md
└─ assets/
   ├─ logo.png
   └─ videos/… (short mp4s or external embeds)
```

#### Why this works

- **Three doors**: Getting Started (fast), Guide (learn), API (deep).
- **Examples** become first-class (your `app/*` → `examples/*` mapping).
- **Generated API** moves under `/api/*` (no “random generated” folders).
- Complex stuff is in **Reference** and **Guide** deep dives, not on the homepage.

---

## 2) Move/merge plan from your current tree

**You have now**

```
getting-started/{index,installation,quick-start}.md
guide/*.md
api/{index.md, actions.md, events.md, jobs.md, policy.md, reporter.md, resources.md, useAction.md, usePrefetcher.md, generated/...}
packages/{cli.md, core.md, ui.md, e2e-utils.md}
reference/contracts.md
contributing/*
```

**Do this (low-friction moves):**

- **Homepage**: keep `index.md`, rewrite to marketing angle (see §6 copy blocks).
- **Getting Started**: keep as is (good skeleton).
- **Examples**:
    - Rename repo `app/*` → `examples/*` (already planned).
    - Create `docs/examples/index.md` with a card grid linking to each example.
    - One concise page per example (setup, what it shows, commands).

- **Guide**:
    - Merge `guide/resources.md` (beginner) and keep `resources-advanced.md` as a “Deep dive” section within the same page (use `<details>`).
    - Fold `guide/repository-handbook.md` into `contributing/index.md` (dev-centric).
    - Rename `guide/showcase.md` → `examples/showcase.md` (and link from Examples).
    - Add `guide/blocks.md` - merge your scattered block content + manifest + render.php guidance in one doc.

- **Reference**:
    - Keep `reference/contracts.md`.
    - Add `reference/wpk-config.md` (canonical, commented, source of truth).
    - Add `reference/decision-matrix.md` (your “what gets generated” table).
    - Add `reference/cli-commands.md` (truth for flags/flows).

- **API**:
    - Move all typedoc **generated** content to `docs/api/{cli,core,ui}/…`.
    - Keep “handwritten API guides” (actions, events, reporter, resources) at:
        - Either **Guide** (conceptual) or **API** (reference).
          Recommendation: move **conceptual** pieces into Guide, and link to the **typedoc** pages for the low-level details.

- **Packages**:
    - Convert `packages/*` into overview pages that link to the typedoc trees:
        - `packages/cli.md` → becomes `/api/cli/` landing
        - `packages/core.md` → `/api/core/`
        - `packages/ui.md` → `/api/ui/`

---

## 3) VitePress wiring (nav, sidebar, typedoc)

#### `docs/.vitepress/config.ts` (essentials)

```ts
import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'WP Kernel',
	description: 'One config → a working WordPress plugin',
	lang: 'en-US',
	lastUpdated: true,
	themeConfig: {
		logo: '/assets/logo.png',
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/<org>/wp-kernel' },
		],
		nav: [
			{ text: 'Getting Started', link: '/getting-started/' },
			{ text: 'Guide', link: '/guide/' },
			{ text: 'Examples', link: '/examples/' },
			{ text: 'API', link: '/api/' },
		],
		sidebar: {
			'/getting-started/': [
				{ text: 'Overview', link: '/getting-started/' },
				{ text: 'Installation', link: '/getting-started/installation' },
				{ text: 'Quick Start', link: '/getting-started/quick-start' },
			],
			'/guide/': [
				{ text: 'Overview', link: '/guide/' },
				{ text: 'Resources', link: '/guide/resources' },
				{ text: 'Actions', link: '/guide/actions' },
				{ text: 'Policy', link: '/guide/policy' },
				{ text: 'DataViews', link: '/guide/dataviews' },
				{ text: 'Blocks', link: '/guide/blocks' },
				{ text: 'Interactivity', link: '/guide/interactivity' },
				{ text: 'Prefetching', link: '/guide/prefetching' },
				{ text: 'Reporting', link: '/guide/reporting' },
				{ text: 'Modes', link: '/guide/modes' },
			],
			'/examples/': [
				{ text: 'All Examples', link: '/examples/' },
				// Generated list or hand-maintained
			],
			'/reference/': [
				{ text: 'Kernel Config', link: '/reference/wpk-config' },
				{ text: 'Contracts & Schemas', link: '/reference/contracts' },
				{ text: 'Decision Matrix', link: '/reference/decision-matrix' },
				{ text: 'CLI Commands', link: '/reference/cli-commands' },
			],
			'/api/': [
				{ text: 'API Index', link: '/api/' },
				{ text: 'CLI (Typedoc)', link: '/api/@wpkernel/cli/README' },
				{ text: 'Core (Typedoc)', link: '/api/core/src/README' },
				{ text: 'UI (Typedoc)', link: '/api/@wpkernel/ui/README' },
			],
			'/contributing/': [
				{ text: 'Overview', link: '/contributing/' },
				{ text: 'Setup', link: '/contributing/setup' },
				{ text: 'Testing', link: '/contributing/testing' },
				{ text: 'E2E', link: '/contributing/e2e-testing' },
				{ text: 'Runbook', link: '/contributing/runbook' },
				{ text: 'Roadmap', link: '/contributing/roadmap' },
			],
		},
		search: { provider: 'local' },
	},
});
```

#### Typedoc → VitePress (generated API)

- Generate typedoc into `docs/api/{cli,core,ui}/…`.
- Keep their `README.md` files and module trees intact.
- Do **not** duplicate; link to them from Guide pages where needed.

---

## 4) Content priorities (sell first, deep later)

#### Make these three pages _great_:

1. **Landing (`/`)**
    - What it is in one sentence: _“One config → a working WordPress plugin (REST, Blocks, DataViews, Policies)-generated for you.”_
    - 3 CTAs: **Quick Start**, **See an Example**, **Why Kernel?**
    - 90-sec video embed showing `wpk init → generate → apply → start → edit block → SSR`.

2. **Quick Start (`/getting-started/quick-start`)**
    - Copy-paste commands (no scrolling):

        ```
        pnpm add -D @wpk/cli
        wpk init my-plugin
        cd my-plugin
        wpk generate
        wpk apply
        wpk start
        ```

    - Show the single `src/index.ts` using `configureWPKernel`.
    - Link to **Decision Matrix** for "what got generated".

3. **Kernel Config (`/reference/wpk-config`)**
    - The **commented** canonical template (the one we discussed).
    - Use collapsible sections for advanced fields.
    - Link “see Decision Matrix” near each field that affects generation.

---

## 5) Where the videos go

- Place short mp4s in `docs/assets/videos/…` or host externally (lighter repo).
- Embed where it matters:
    - `/` landing (90 sec end-to-end)
    - `/getting-started/quick-start` (30 sec)
    - `/guide/blocks` (30-45 sec on SSR vs JS-only)
    - `/guide/dataviews` (30 sec configuring a table)

- Keep them **short** and contextual. A wall of videos kills scanning.

---

## 6) Landing page copy blocks (steal this)

**Hero**

> **One config → a working WordPress plugin**
> Define your resources, blocks, and UI once. WP Kernel generates REST controllers, block manifests, DataViews screens, and policy guards-so you can build features, not boilerplate.

**Three pillars**

- **Generate, don’t glue** - `wpk generate` produces PHP/TS/manifest files from a single `wpk.config.ts`.
- **Interop by default** - kernel plugins share the same runtime graph; resources and actions “just work” across plugins.
- **Modern WP, batteries included** - Script Modules, SSR blocks via `render.php`, DataViews integration, policy keys → caps.

**Code card**

```ts
// src/index.ts
import { configureWPKernel } from '@wpk/core';
import { wpkConfig } from '@kernel-config';

configureWPKernel({
	namespace: wpkConfig.namespace,
	registry: window.wp?.data,
});
```

**CTA buttons**: Quick Start • See Examples • Why Kernel?

---

## 7) Minimal changes in repo to support this

- Move typedoc output under `docs/api/*` (adjust typedoc outDir).
- Create `docs/examples/` from `examples/*` with one page per example.
- Create the three new **Reference** pages (kernel-config, decision-matrix, cli-commands).
- Merge/rename a few Guides as noted.

---

## 8) “Generated docs” cleanup

Right now you have:

```
api/generated/@wpkernel/{cli,ui}/...
api/generated/core/src/...
```

Replace with:

```
docs/api/@wpkernel/cli/...
docs/api/@wpkernel/ui/...
docs/api/core/src/...
```

Then update `/api/index.md` to link to those trees.
Delete the old `api/generated` root.

---

## 9) CLI command page (authoritative)

In `/reference/cli-commands.md` list **only** the commands you actually ship now:

- `wpk init` (scaffold root files)
- `wpk generate` (`--dry-run`, `--verbose`)
- `wpk apply` (`--yes`, `--backup`, `--force`)
- `wpk start` (watch + regenerate + enqueue, replaces “dev”)
- `wpk build` (one-shot build of artifacts for CI)
- `wpk doctor` (sanity checks)

Each with tiny examples and a flow diagram: _init → edit config → generate → apply → start_.

---

## 10) Checklist

- Move typedoc output to `docs/api/*`.
- Create `/examples/index.md` + 2-3 example pages.
- Draft landing page + quick start + kernel config.
- Create `reference/decision-matrix.md` and `reference/cli-commands.md`.
- Reorganize Guides (blocks, dataviews, resources merge).
- Wire VitePress config + sidebar.
- Add 2 short videos (quick start, blocks) or placeholders.
- Broken link check, local search test, dark mode check.
- Run through the “golden path” as a new user; tighten copy.
- Polish examples, add screenshots, trim jargon.
