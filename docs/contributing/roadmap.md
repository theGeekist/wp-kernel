# Roadmap

WP Kernel is under active development with a focus on shipping stable, production-ready packages that work together seamlessly. This roadmap provides transparency into our development phases and upcoming features.

## Current Phase: Sprint 2 - E2E Testing Foundation

**Status**: In Progress  
**Focus**: Establishing comprehensive testing infrastructure for all future development

### Goals

- Ship `@geekist/wp-kernel-e2e-utils` as a stable, documented package
- Create kernel-aware testing utilities that extend WordPress E2E tools
- Validate utilities through real-world usage in showcase app
- Establish testing patterns for the entire ecosystem

### Key Deliverables

- ✅ Namespaced API (`auth`, `db`, `rest`, `store`, `events`, `project`)
- ✅ Playwright fixture integration with kernel helpers
- 🚧 Comprehensive utility functions for all common testing scenarios
- 🚧 Documentation and examples for testing patterns
- ⏳ Showcase app E2E tests using new utilities

**Why This Matters**: Testing infrastructure is foundational. By getting this right early, we ensure all future features can be thoroughly validated in real WordPress environments.

## Completed Phases

### ✅ Sprint 1 - Core Framework (October 2025)

**Delivered**:

- Core `@geekist/wp-kernel` package with resources, actions, events, and jobs
- WordPress-native state management with `@wordpress/data` integration
- Actions-first architecture preventing direct UI → transport calls
- Canonical event system with stable taxonomy
- Background job processing with polling support
- Comprehensive documentation and showcase examples

**Impact**: Established the foundational architecture and patterns that all other packages build upon.

### ✅ Sprint 1.5 - Build Tooling (October 2025)

**Delivered**:

- Vite-based build system optimized for WordPress
- WordPress externals handling to reduce bundle sizes
- TypeScript configuration with strict mode
- Dual-surface API (scoped, namespace, and flat imports)
- Development workflow with hot reloading

**Impact**: Created a professional development experience that matches modern JavaScript tooling expectations.

## Upcoming Phases

### Sprint 3 - User Authorization & Permissions

**Timeline**: Q1 2026  
**Focus**: Client-side capability hints with server-side enforcement

**Planned Features**:

- `definePolicy` for capability-based UI controls
- Client-side permission hints with server authoritative checks
- Integration with WordPress capability system
- Policy denial events and user feedback
- Role-based component rendering

**Why Next**: With core functionality and testing established, authorization becomes critical for building real applications that respect WordPress user roles.

### Sprint 4 - Advanced Features & Polish

**Timeline**: Q1-Q2 2026  
**Focus**: Production readiness and developer experience enhancements

**Planned Areas**:

- Advanced caching strategies and cache warming
- Performance optimizations and bundle analysis
- Enhanced CLI generators and templates
- UI component library completion
- Analytics and monitoring integrations
- Migration tools and upgrade paths

### Sprint 5 - Ecosystem Expansion

**Timeline**: Q2-Q3 2026  
**Focus**: Community adoption and ecosystem growth

**Planned Areas**:

- Third-party integrations (popular plugins/services)
- Community plugin templates and examples
- Advanced customization and extension points
- Multi-site and enterprise features
- International and accessibility enhancements

## Philosophy & Approach

### Incremental Value Delivery

Each sprint delivers **complete, usable value** rather than partial features:

- Sprint 1: Complete core framework ready for building apps
- Sprint 2: Complete testing solution ready for production use
- Sprint 3: Complete authorization system ready for multi-user apps

### Real-World Validation

Every feature is validated through the **showcase application**:

- Demonstrates complete job listing and application system
- Exercises all framework capabilities in realistic scenarios
- Provides working examples for documentation
- Reveals integration issues before public release

### WordPress-First Development

All decisions prioritize **WordPress compatibility and conventions**:

- Build on core WordPress primitives (Script Modules, Interactivity API, etc.)
- Respect WordPress coding standards and patterns
- Ensure plugin and theme ecosystem compatibility
- Maintain backward compatibility when possible

## Community Involvement

### Contributing Opportunities

**Current Needs**:

- Testing the framework with real projects
- Documentation improvements and examples
- Bug reports and edge case identification
- WordPress ecosystem integration feedback

**How to Get Involved**:

- Try WP Kernel in your projects and share feedback
- Contribute to documentation and examples
- Report issues and suggest improvements
- Join community discussions about roadmap priorities

### Feedback Channels

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Architecture questions and community support
- **Documentation**: Improvements and clarifications needed
- **Examples**: Real-world usage patterns and case studies

## Technical Priorities

### Performance

- Bundle size optimization through tree-shaking
- Smart caching with minimal overhead
- WordPress externals to leverage platform optimizations
- Lazy loading and code splitting strategies

### Developer Experience

- Comprehensive TypeScript support with strict mode
- Clear error messages and debugging information
- Hot reloading and fast iteration cycles
- Comprehensive documentation with working examples

### Production Readiness

- Comprehensive test coverage (≥95% statements, ≥98% functions)
- Error handling and recovery patterns
- Performance monitoring and optimization tools
- Security best practices and audit trail

### WordPress Integration

- Deep integration with WordPress core features
- Respect for WordPress conventions and patterns
- Plugin and theme ecosystem compatibility
- Multi-site and enterprise environment support

## Long-Term Vision

WP Kernel aims to become the **Rails of WordPress development** - providing:

- **Convention over configuration** for faster development
- **Complete toolchain** from scaffolding to deployment
- **Predictable patterns** that scale from simple plugins to complex applications
- **Strong community** of developers sharing patterns and solutions

We believe WordPress development should be as productive and enjoyable as modern web frameworks while maintaining the accessibility and flexibility that makes WordPress powerful.

## Release Strategy

### Semantic Versioning

- **Major versions**: Breaking changes or significant architectural shifts
- **Minor versions**: New features that maintain backward compatibility
- **Patch versions**: Bug fixes and documentation improvements

### Release Cadence

- **Sprint releases**: Major feature deliveries every 6-8 weeks
- **Maintenance releases**: Bug fixes and minor improvements weekly
- **Security releases**: Critical fixes released immediately

### Beta Program

Early access to upcoming features for community validation:

- Sprint previews for feedback and testing
- Breaking change previews with migration guidance
- Performance and compatibility testing

---

_This roadmap is updated regularly based on community feedback and development progress. Join our [GitHub Discussions](https://github.com/theGeekist/wp-kernel/discussions) to share your thoughts and priorities._
