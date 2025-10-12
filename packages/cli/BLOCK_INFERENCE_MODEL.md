# Block Inference Model

> **Summary of our block inference discussion** - the "aha" moment where we realised we could **eliminate create-block entirely** and derive everything from the kernel config.

---

## 🧩 Core Insight

WordPress's official `create-block` command just copies static templates and fills placeholders.
We already have a **richer, structured config** (`kernel.config.ts`) that captures everything about a plugin's data, UI, and server model.

So - instead of authors defining blocks separately, the **CLI infers them** from that config.

---

## 🧱 What We Infer Automatically

### 1. **Block Existence**

- If a resource defines **UI or public data** (e.g. `ui.admin.dataviews` or routes with `GET`),
  → a block can be **inferred** for it.
- If a directory already has `block.json`, we respect it (existing manual block).
- If no `block.json`, the CLI **generates one** on `wpk generate`.

---

### 2. **Block Type**

| Context in Config                                      | Inferred Block Type                |
| ------------------------------------------------------ | ---------------------------------- |
| Resource with **storage** and **local routes**         | SSR Block → `render.php` generated |
| Resource with only **remote routes** or **no storage** | JS-only Block → client-rendered    |
| Resource with **dataviews** (UI)                       | Admin Screen + Block (edit only)   |

---

### 3. **What Goes Into `block.json`**

Inferred from config:

| Field                | Source                                                |
| -------------------- | ----------------------------------------------------- |
| `name`               | `${namespace}/${resourceName}`                        |
| `title`              | `resource.displayName` or fallback to PascalCase name |
| `description`        | From `resource.description`                           |
| `apiVersion`         | Defaults to **3** (for modern builds)                 |
| `textdomain`         | From plugin header or `${namespace}`                  |
| `attributes`         | From resource `schema` (`auto`, inline, or reference) |
| `supports`           | Opinionated defaults (alignment, spacing, typography) |
| `editorScriptModule` | Always points to the Vite-built edit entry            |
| `viewScriptModule`   | Only added if block is JS-only                        |
| `render`             | `"file:./render.php"` added if SSR block              |
| `category`           | Default "widgets" (can override later)                |

---

### 4. **File Generation**

| File                               | Description                                |
| ---------------------------------- | ------------------------------------------ |
| `src/blocks/<blockName>/index.tsx` | Edit component scaffolded by CLI           |
| `src/blocks/auto-register.ts`      | Generated registry for all JS-only blocks  |
| `build/blocks-manifest.php`        | Generated manifest for SSR blocks          |
| `inc/Blocks/Register.php`          | Minimal registrar looping through manifest |

---

## ⚙️ CLI Flow

| Command                 | What Happens                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **`wpk init <plugin>`** | Creates `kernel.config.ts`, `src/index.ts`, Vite + ESLint presets                         |
| **`wpk generate`**      | Reads config → builds IR → emits schemas, REST, UI, and **block assets** (JS-only or SSR) |
| **`wpk apply`**         | Copies generated PHP + manifest + block assets into the plugin safely                     |

Everything is **derived from the same root config**, no separate per-block configuration or WP boilerplate.

---

## 💡 Developer Experience Benefits

- **Zero duplication** - data schema → REST → block → UI.
- **SSR and JS-only** blocks co-exist automatically.
- **No PHP ceremony** - only a manifest loader when SSR is needed.
- **Better consistency** - names, attributes, and storage all align.
- **Safety** - fences, git guards, auto-diff warnings.

---

## 🔄 Relationship to Phase 1B (Block Discovery)

**Phase 1B** (current PR #110) implements the **discovery layer** that:

- Scans the workspace for existing `block.json` files
- Respects manually-created blocks as overrides
- Provides the fallback mechanism when developers want custom implementations

**Phase 3** (future) will implement the **inference layer** that:

- Analyzes resources in `kernel.config.ts`
- Infers block requirements from resource configuration
- Generates `block.json` + scaffolding for blocks that don't exist yet
- Merges inferred blocks with discovered manual blocks

The discovery layer (Phase 1B) is **foundational** - it identifies what already exists so Phase 3 knows what to generate vs. what to leave alone.
