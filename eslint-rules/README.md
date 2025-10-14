# ESLint Rules for WordPress Kernel Development

This document outlines the custom ESLint rules designed to enforce best practices, maintain naming consistency, and ensure configuration correctness across the Kernel codebase.

---

## `@kernel/no-hardcoded-namespace-strings`

### Purpose

Prevents namespace drift by enforcing the use of **centralised constants** instead of hardcoded namespace strings such as `'wpk'`, `'wpk.action.start'`, or `'kernel.policy'`.

### Why It Matters

Hardcoding namespace strings introduces risk and inconsistency:

- **Namespace drift** when conventions evolve
- **Painful refactoring** across scattered literals
- **Ambiguous API contracts** without standard references
- **Typos and silent failures**
- **Inconsistent naming** across modules

### Detects

#### Event Names

```ts
// ✗ BAD
hooks.doAction('wpk.action.start', event);

// ✓ GOOD
import { WPK_EVENTS } from '../namespace/constants';
hooks.doAction(WPK_EVENTS.ACTION_START, event);
```

#### Subsystem Namespaces

```ts
// ✗ BAD
createReporter({ namespace: 'kernel.policy' });

// ✓ GOOD
import { WPK_SUBSYSTEM_NAMESPACES } from '../namespace/constants';
createReporter({ namespace: WPK_SUBSYSTEM_NAMESPACES.POLICY });
```

#### Infrastructure Identifiers

```ts
// ✗ BAD
new BroadcastChannel('wpk.actions');

// ✓ GOOD
import { WPK_INFRASTRUCTURE } from '../namespace/constants';
new BroadcastChannel(WPK_INFRASTRUCTURE.ACTIONS_CHANNEL);
```

#### Namespace Prefixes

```ts
// ✗ BAD
if (id.startsWith('wpk/')) id = id.slice(4);

// ✓ GOOD
import { WPK_NAMESPACE } from '../namespace/constants';
const prefix = `${WPK_NAMESPACE}/`;
if (id.startsWith(prefix)) id = id.slice(prefix.length);
```

### Skips

- `namespace/constants.ts`
- Tests (`__tests__/**`, `*.test.ts`, `*.spec.ts`)
- Markdown files
- Comments and JSDoc

### Example Diagnostic

```
Hardcoded namespace string "wpk.action.start" found.
Use WPK_EVENTS.ACTION_START from namespace/constants.ts instead.
```

### Implementation Highlights

- Detects both `Literal` and `TemplateLiteral` nodes.
- Ignores comments and documentation.
- Checks for patterns like `'wpk.'`, `'wpk/'`, and legacy `'kernel.'`.

### Benefits

- **Single Source of Truth** for all identifiers
- **Type-safe autocompletion** via constants
- **Seamless refactoring** from one location
- **Explicit, documented API surface**

---

## `@kernel/config-consistency`

### Purpose

Ensures structural consistency across resource configuration objects in `kernel.config.ts`.

### What It Checks

1. **Identity Parameter Matching** – `identity.param` must match route parameters.
2. **Duplicate Route Detection** – Prevents duplicate `method` + `path` combos.
3. **Post Type Validation** – `wp-post` mode must declare a `postType`.

### Example

```ts
// ✗ FAILS
identity: {
	param: 'id';
}
routes: {
	get: {
		path: '/demo/v1/things/:slug';
	}
}

// ✓ GOOD
identity: {
	param: 'slug';
}
```

**Diagnostic**

```
Resource 'job' references identity param 'id' but routes use ':slug'
```

---

## `@kernel/cache-keys-valid`

### Purpose

Ensures cache key functions are valid, serialisable, and predictable.

### What It Checks

1. **Return Type** – Must return an **array**.
2. **Array Elements** – Must be **primitive values**.
3. **Query Param References** – Must match declared `queryParams`.
4. **Allowed Function Calls** – Only safe coercion helpers (`normalizeKeyValue`, `String`, `Number`, `Boolean`).

### Examples

```ts
// ✗ BAD
cacheKeys: {
	list: (params) => 'thing';
}

// ✓ GOOD
cacheKeys: {
	list: (params) => ['thing', params?.search ?? null];
}
```

**Diagnostics**

```
Cache key function for 'list' must return an array, got string
Cache key references unknown query param 'serch' (did you mean 'search'?)
```

### Why It Matters

- Prevents inconsistent cache lookups
- Guarantees serialisability for Redis/Memcached
- Enforces predictable equality semantics

---

## `@kernel/policy-hints`

### Purpose

Encourages **explicit policy declarations** for all write operations.

### What It Checks

- Flags write routes (`POST`, `PUT`, `PATCH`, `DELETE`) missing a `policy` field.
- Read (`GET`) routes are exempt but encouraged.

### Example

```ts
// ✗ FAILS
routes: { create: { method: 'POST' } };

// ✓ GOOD
routes: { create: { method: 'POST', policy: 'things.create' } };
```

**Diagnostic**

```
Write route 'create' should declare a policy identifier
```

---

## `@kernel/doc-links`

### Purpose

Encourages self-documenting `kernel.config.ts` files by linking to official CLI spec documentation.

### What It Checks

- Detects missing documentation link comments before `kernelConfig` exports.
- Offers auto-fix insertion.

### Example

```ts
// ✗ WARN
export const kernelConfig = { version: 1, namespace: 'demo' };

// ✓ GOOD
// For CLI config guidance see https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety
export const kernelConfig = { version: 1, namespace: 'demo' };
```

**Diagnostic**

```
Add a documentation reference comment for kernelConfig. Developers resolving lint diagnostics should review <doc-url>.
```

---

## Integration

### ESLint Configuration

```js
import noHardcodedNamespaceStrings from './eslint-rules/no-hardcoded-namespace-strings.js';
import configConsistency from './eslint-rules/config-consistency.js';
import cacheKeysValid from './eslint-rules/cache-keys-valid.js';
import policyHints from './eslint-rules/policy-hints.js';
import docLinks from './eslint-rules/doc-links.js';

const kernelPlugin = {
	rules: {
		'no-hardcoded-namespace-strings': noHardcodedNamespaceStrings,
		'config-consistency': configConsistency,
		'cache-keys-valid': cacheKeysValid,
		'policy-hints': policyHints,
		'doc-links': docLinks,
	},
};

export default [
	{
		plugins: { '@kernel': kernelPlugin },
		rules: {
			'@kernel/no-hardcoded-namespace-strings': 'error',
			'@kernel/config-consistency': 'error',
			'@kernel/cache-keys-valid': 'error',
			'@kernel/policy-hints': 'error',
			'@kernel/doc-links': 'warn', // auto-fixable
		},
	},
];
```

---

## Testing

Each rule includes full coverage under `packages/cli/__tests__/eslint-rules`.

```bash
pnpm --filter @wpkernel/cli test
```

Tests use ESLint’s `RuleTester` with `@typescript-eslint/parser`, covering valid/invalid cases, edge scenarios, and auto-fix validation.

---

## References

- **Constants**: `packages/core/src/namespace/constants.ts`
- **Evaluator Utils**: `eslint-rules/utils/kernel-config-evaluator.js`
- **CLI Spec**: [MVP CLI Spec §6 - Authoring Safety](../packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety)
- **PR**: [#112 – ESLint Plugin Extensions](https://github.com/theGeekist/wp-kernel/pull/112)
