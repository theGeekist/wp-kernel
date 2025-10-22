# @wpkernel/php-json-ast

Utilities and type definitions for working with the JSON AST emitted by [`nikic/php-parser`](https://github.com/nikic/PHP-Parser).

> **Status:** Experimental. The package currently provides lightweight helpers that wrap raw JSON payloads and will soon host the full PHP builder implementation that lives in `@wpkernel/cli` today.

## Installation

```bash
pnpm add @wpkernel/php-json-ast
```

## Usage

```ts
import { isPhpJsonNode, normalisePhpAttributes } from '@wpkernel/php-json-ast';

const payload = JSON.parse(fs.readFileSync('ast.json', 'utf8'));

if (!isPhpJsonNode(payload)) {
	throw new Error('Unexpected payload');
}

const attributes = normalisePhpAttributes(payload.attributes);
```

## Contributing

This package is part of the WP Kernel monorepo. Please see the root [CONTRIBUTING](../../DEVELOPMENT.md) guide for local development instructions.
