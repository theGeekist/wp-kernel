# VS Code Workspace Setup

This document describes the VS Code configuration for WP Kernel development.

## Overview

The workspace is configured with:

- **Prettier** for code formatting (WordPress standards)
- **ESLint** for linting (WordPress + TypeScript rules)
- **TypeScript** for type checking
- **Tasks** for common development workflows
- **Launch configs** for debugging

## Installed Extensions

Recommended extensions (see `.vscode/extensions.json`):

- `esbenp.prettier-vscode` - Prettier formatter
- `dbaeumer.vscode-eslint` - ESLint linter
- `ms-playwright.playwright` - Playwright test runner
- `bmewburn.vscode-intelephense-client` - PHP IntelliSense
- `bradlc.vscode-tailwindcss` - Tailwind CSS support

## Editor Settings

Key configurations (`.vscode/settings.json`):

- Format on save enabled
- ESLint auto-fix on save
- Tab size: 2 spaces (tabs, not spaces - WordPress standard)
- TypeScript: Uses workspace version
- Package manager: pnpm

## Tasks

All tasks are defined in `.vscode/tasks.json` and can be run via:

- **Command Palette**: `Tasks: Run Task`
- **Keyboard**: `Cmd+Shift+B` for build tasks
- **Terminal menu**: "Run Task..."

### Build Tasks

| Task                  | Command                                  | Description                     |
| --------------------- | ---------------------------------------- | ------------------------------- |
| Build All             | `pnpm build`                             | Build all packages and examples |
| Build Kernel          | `pnpm --filter @wpkernel/core build`     | Build core wpk package          |
| Build UI              | `pnpm --filter @wpkernel/ui build`       | Build UI components             |
| Build CLI             | `pnpm --filter @wpkernel/cli build`      | Build CLI tool                  |
| Build Showcase Plugin | `pnpm --filter wp-kernel-showcase build` | Build demo plugin               |

### Dev/Watch Tasks

| Task                       | Command                                | Description                    |
| -------------------------- | -------------------------------------- | ------------------------------ |
| Dev: Watch All Packages    | `pnpm dev`                             | Watch all packages in parallel |
| Dev: Watch Showcase Plugin | `pnpm --filter wp-kernel-showcase dev` | Watch plugin with webpack      |

### WordPress Tasks

| Task                   | Command           | Description                     |
| ---------------------- | ----------------- | ------------------------------- |
| WordPress: Start       | `pnpm wp:start`   | Start wp-env (ports 8888, 8889) |
| WordPress: Stop        | `pnpm wp:stop`    | Stop wp-env                     |
| WordPress: Restart     | `pnpm wp:restart` | Stop then start                 |
| WordPress: Fresh Start | `pnpm wp:fresh`   | Start + run seeds               |
| WordPress: Destroy     | `pnpm wp:destroy` | Destroy containers              |

### Testing Tasks

| Task                     | Command           | Description            |
| ------------------------ | ----------------- | ---------------------- |
| Test: Unit Tests         | `pnpm test`       | Run Jest tests         |
| Test: Unit Tests (Watch) | `pnpm test:watch` | Run Jest in watch mode |
| Test: E2E Tests          | `pnpm e2e`        | Run Playwright tests   |
| Test: E2E Tests (Headed) | `pnpm e2e:headed` | Run E2E with browser   |
| Test: E2E Tests (UI)     | `pnpm e2e:ui`     | Open Playwright UI     |

### Linting Tasks

| Task           | Command             | Description            |
| -------------- | ------------------- | ---------------------- |
| Lint           | `pnpm lint`         | Run ESLint             |
| Format         | `pnpm format`       | Format with Prettier   |
| Format: Check  | `pnpm format:check` | Check formatting       |
| TypeCheck: All | `pnpm typecheck`    | Check TypeScript types |

### Cleanup Tasks

| Task                | Command      | Description                         |
| ------------------- | ------------ | ----------------------------------- |
| Clean: All          | `pnpm clean` | Remove dist + node_modules          |
| Clean: node_modules | (custom)     | Remove all node_modules + reinstall |

## Debugging

Launch configurations (`.vscode/launch.json`):

### Debug Jest Tests

Debug all Jest unit tests with breakpoints.

### Debug Current Jest Test

Debug the currently open test file.

### Debug CLI

Debug the WP Kernel CLI tool (`wpk` command).

## Keyboard Shortcuts

### Build

- `Cmd+Shift+B` - Run default build task (Build All)

### Testing

- `Cmd+Shift+T` - Run test task

### Debugging

- `F5` - Start debugging
- `Shift+F5` - Stop debugging
- `F9` - Toggle breakpoint
- `F10` - Step over
- `F11` - Step into

## Tips

### Quick Task Access

1. Press `Cmd+Shift+P`
2. Type "run task"
3. Select from the list

### Background Tasks

Some tasks run in the background:

- **Dev: Watch All Packages** - Keep this running while developing
- **Dev: Watch Showcase Plugin** - Keep this running when working on the plugin

### Parallel Execution

You can run multiple tasks simultaneously:

- Open multiple terminals (`` Ctrl+` ``)
- Run different tasks in each terminal

### WordPress Development

1. Start background watch: Run "Dev: Watch All Packages"
2. Start WordPress: Run "WordPress: Start"
3. Access sites:
    - Dev: http://localhost:8888 (admin: admin/password)
    - Tests: http://localhost:8889

### Type Safety

TypeScript will show errors inline in the editor. To see all errors:

- Run "TypeCheck: All" task
- Or use the Problems panel (`Cmd+Shift+M`)

## Troubleshooting

### Task not found

If a task doesn't appear:

1. Reload VS Code (`Cmd+Shift+P` → "Reload Window")
2. Check `.vscode/tasks.json` is valid JSON

### TypeScript errors

If TypeScript can't find types:

1. Run `pnpm install`
2. Run "TypeScript: Reload Project" (`Cmd+Shift+P`)
3. Ensure workspace TypeScript is selected (bottom-right of editor)

### ESLint not working

1. Check ESLint output panel
2. Reload ESLint server: `Cmd+Shift+P` → "ESLint: Restart ESLint Server"
3. Ensure `eslint.config.js` exists

### Prettier not formatting

1. Check Prettier output panel
2. Ensure file type is supported (JS, TS, JSON, MD, YAML)
3. PHP files are excluded by design (WordPress standards)
