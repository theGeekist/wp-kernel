# Formatting Scripts

## normalize-punctuation.js

**Purpose:** Enforces consistent punctuation in markdown files by normalizing em dashes (-) to hyphens (-).

**Why:** Em dashes can be inconsistent across different editors and locales. Standard hyphens ensure:

- Consistent plain text readability
- No copy/paste formatting issues
- Better diff clarity in version control

**When it runs:**

1. Automatically after `pnpm format`
2. Automatically on markdown files via `lint-staged` (pre-commit hook)
3. Manually: `node scripts/normalize-punctuation.js`

**Configuration:**

- Ignores: `node_modules/`, `dist/`, `build/`, `coverage/`
- Targets: All `*.md` files in the workspace
- Reports: Number of replacements per file

**Example output:**

```
✓ AGENTS.md: replaced 1 em dash(es)
✓ packages/core/src/policy/Policy Spec.md: replaced 2 em dash(es)

Total: 3 em dash(es) normalized to hyphens
```

## Adding New Formatting Rules

To add a new post-formatting rule:

1. Create a new script in `scripts/` (e.g., `normalize-quotes.js`)
2. Add it to the `format` command in `package.json`:
    ```json
    "format": "prettier --write '...' && node scripts/normalize-punctuation.js && node scripts/normalize-quotes.js"
    ```
3. Optionally add to `lint-staged` for pre-commit enforcement
4. Document the rule in this README
