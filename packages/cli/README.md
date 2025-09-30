# @geekist/wp-kernel-cli

> CLI for scaffolding and managing WP Kernel projects

## Overview

Command-line interface for generating resources, actions, components, and managing WP Kernel projects.

## Installation

```bash
npm install -g @geekist/wp-kernel-cli
# or
pnpm add -g @geekist/wp-kernel-cli
```

Or use without installing:

```bash
npx @geekist/wp-kernel-cli init my-project
```

## Commands

### Initialize a New Project

```bash
wpk init [options]
wpk init my-plugin --template=plugin
```

**Options:**

- `-n, --name <name>` - Project name
- `-t, --template <template>` - Template to use (default, plugin, theme)

### Generate Resources

```bash
wpk generate resource <name>
wpk g resource Post
```

Generates:

- `app/resources/Post.ts` - Resource definition
- `contracts/post.schema.json` - JSON Schema
- Types in `types/post.d.ts`

### Generate Actions

```bash
wpk generate action <domain>/<name>
wpk g action Post/Create
```

Generates:

- `app/actions/Post/Create.ts` - Action with event emission
- Unit test stub

### Generate Components

```bash
wpk generate component <name>
wpk g component PostList
```

Generates:

- `app/views/components/PostList.tsx` - React component
- Storybook story (if configured)

### Check Project Health

```bash
wpk doctor
```

Checks:

- Node/pnpm versions
- TypeScript configuration
- WordPress dependencies
- Lint/format setup

## Templates

Available project templates:

- **default** - Basic WP Kernel setup
- **plugin** - WordPress plugin structure
- **theme** - WordPress theme structure
- **block** - Single block plugin

## Configuration

Create `wpk.config.js` in your project root:

```javascript
export default {
	paths: {
		resources: 'app/resources',
		actions: 'app/actions',
		views: 'app/views',
		contracts: 'contracts',
	},
	typescript: true,
	testing: 'jest',
};
```

## Planned Features

- [ ] Interactive project initialization
- [ ] Code generation with templates
- [ ] Database schema sync
- [ ] WordPress plugin packaging
- [ ] Deployment helpers
- [ ] Migration generation

## Documentation

For complete documentation, see the [main repository](https://github.com/theGeekist/wp-kernel).

## License

MIT © [The Geekist](https://github.com/theGeekist)
