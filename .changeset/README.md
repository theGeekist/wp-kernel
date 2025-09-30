# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## Quick Start

### Creating a Changeset

When you make changes that should be released, create a changeset:

```bash
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose bump type (major/minor/patch)
3. Write a summary of changes

### Changeset Types

#### Pre-1.0 (Current: 0.x.x)

We're in **pre-1.0 development**:

- **Minor (0.x.0)**: May include breaking changes - API is still evolving
- **Patch (0.0.x)**: Bug fixes and non-breaking changes only

Example:

```markdown
---
'@geekist/wp-kernel': minor
---

Add Resource API with cache invalidation
```

#### Post-1.0 (Future: 1.0.0+)

After reaching 1.0.0, we follow strict SemVer:

- **Major (x.0.0)**: Breaking changes
- **Minor (0.x.0)**: New features (backward compatible)
- **Patch (0.0.x)**: Bug fixes only

### Versioning Packages

When ready to release:

```bash
# Preview version bumps
pnpm changeset status

# Apply version bumps (updates package.json + CHANGELOG.md)
pnpm changeset version

# Commit the version changes
git add .
git commit -m "chore: version packages"

# Publish to npm (CI will handle this)
pnpm changeset publish
```

### Common Workflows

#### Bug Fix

```bash
# Fix the bug
git add .
git commit -m "fix: resolve issue with cache invalidation"

# Create changeset
pnpm changeset
# Select affected packages → patch
# Summary: "Fix cache invalidation race condition"
```

#### New Feature

```bash
# Build the feature
git add .
git commit -m "feat: add Job polling with exponential backoff"

# Create changeset
pnpm changeset
# Select affected packages → minor (pre-1.0) or minor (post-1.0)
# Summary: "Add Job.wait() with configurable polling strategy"
```

#### Breaking Change (Pre-1.0)

```bash
# Make breaking changes
git add .
git commit -m "feat!: redesign Resource API"

# Create changeset
pnpm changeset
# Select affected packages → minor (pre-1.0 allows breaking in minor)
# Summary: "BREAKING: Resource API now uses async generators"
```

#### Breaking Change (Post-1.0)

```bash
# Make breaking changes
git add .
git commit -m "feat!: redesign Resource API"

# Create changeset
pnpm changeset
# Select affected packages → major
# Summary: "BREAKING: Resource API now uses async generators"
```

### Linked Packages

If packages should always version together, use `linked` in `config.json`:

```json
{
	"linked": [["@geekist/wp-kernel", "@geekist/wp-kernel-ui"]]
}
```

When one changes, both get bumped.

### Fixed Packages

For monorepos where all packages share the same version:

```json
{
	"fixed": [["@geekist/*"]]
}
```

All packages always have the same version number.

**Current Strategy**: Neither linked nor fixed - each package versions independently.

### CI Integration

In CI (GitHub Actions), we:

1. **On PR**: Comment with `changeset status` to show what will be released
2. **On merge to main**: Auto-create "Version Packages" PR with bumps
3. **On merge Version PR**: Publish to npm and create GitHub releases

### Tips

- **One changeset per logical change** - Don't combine unrelated changes
- **Be specific in summaries** - They become CHANGELOG entries
- **Reference issues/PRs** - e.g., "Fix #123: resolve cache bug"
- **Use conventional commit prefixes** - feat:, fix:, docs:, etc.

### Pre-1.0 Versioning Strategy

We're currently at **0.x.x** because:

- Event taxonomy is not frozen yet
- Resource API may evolve
- PHP bridge behavior may change

**When we hit 1.0.0**:

- Event names become stable contracts
- SemVer guarantees apply strictly
- Deprecation workflow required before removals

### More Information

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
