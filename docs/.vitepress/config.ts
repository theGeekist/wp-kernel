// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

// Fast mode for pre-commit hooks (MPA mode + no minification)
const FAST = process.env.DOCS_FAST === '1';
const PROD = process.env.NODE_ENV === 'production';

export default withMermaid(
	defineConfig({
		title: 'WP Kernel',
		description:
			'A Rails-like, opinionated framework for building modern WordPress products',
		base: '/wp-kernel/',
		lastUpdated: true,
		sitemap: { hostname: 'https://thegeekist.github.io' },

		// Keep wp-env localhost URLs valid (any port + path)
		ignoreDeadLinks: [
			/^https?:\/\/localhost(?::\d+)?(?:\/|$)/,
			/^https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/,
		],

		// Fast path for pre-commit; set to true for PROD if you can live without SPA nav
		mpa: FAST, // <-- set to (FAST || PROD) if you want minimal JS in production too

		// Big win: limit Shiki languages (reduces client+server bundle a lot)
		markdown: {
			theme: { light: 'github-light', dark: 'github-dark' },
		},

		// Exclude heavy generated API pages from local search index (keeps render, shrinks search)
		transformPageData(page) {
			if (page.filePath?.includes('/docs/api/generated/')) {
				page.frontmatter ||= {};
				page.frontmatter.search = false;
			}
		},

		vite: {
			cacheDir: 'node_modules/.vite-docs',

			build: FAST
				? {
						minify: false,
						cssMinify: false,
						reportCompressedSize: false,
						sourcemap: false,
					}
				: {
						reportCompressedSize: false,
						// split the usual suspects so main stays slim
						rollupOptions: {
							output: {
								manualChunks(id) {
									if (id.includes('mermaid'))
										return 'mermaid';
									if (id.includes('shiki')) return 'shiki';
									if (
										id.includes('fuse') ||
										id.includes('mini-search')
									)
										return 'search';
									if (
										id.includes('/@vitepress/') ||
										id.includes('/vitepress/')
									)
										return 'vp';
									if (id.includes('/vue/')) return 'vue';
								},
							},
						},
						// warning threshold only (we're splitting sensibly above)
						chunkSizeWarningLimit: 2000,
					},

			resolve: { dedupe: ['vue'] },
			optimizeDeps: {
				include: ['mermaid'], // speeds dev HMR for pages with diagrams
			},
		},

		themeConfig: {
			logo: '/logo.png',
			editLink: {
				pattern:
					'https://github.com/theGeekist/wp-kernel/edit/main/docs/:path',
				text: 'Edit this page on GitHub',
			},
			externalLinkIcon: true,

			nav: [
				{ text: 'Home', link: '/' },
				{ text: 'Getting Started', link: '/getting-started/' },
				{ text: 'Guide', link: '/guide/' },
				{ text: 'Packages', link: '/packages/' },
				{ text: 'API', link: '/api/' },
				{ text: 'Contributing', link: '/contributing/' },
			],

			sidebar: {
				'/getting-started/': [
					{
						text: 'Getting Started',
						collapsed: false,
						items: [
							{ text: 'Introduction', link: '/getting-started/' },
							{
								text: 'Installation',
								link: '/getting-started/installation',
							},
							{
								text: 'Quick Start',
								link: '/getting-started/quick-start',
							},
						],
					},
					{
						text: 'Next Steps',
						collapsed: true,
						items: [
							{ text: 'Core Concepts', link: '/guide/' },
							{
								text: 'Repository Handbook',
								link: '/guide/repository-handbook',
							},
							{
								text: 'Showcase Plugin',
								link: '/guide/showcase',
							},
							{ text: 'Roadmap', link: '/contributing/roadmap' },
						],
					},
				],
				'/guide/': [
					{
						text: 'Core Concepts',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/guide/' },
							{
								text: 'Philosophy & Architecture',
								link: '/guide/philosophy',
							},
							{ text: 'Resources', link: '/guide/resources' },
							{ text: 'Actions', link: '/guide/actions' },
							{ text: 'Events', link: '/guide/events' },
							{
								text: 'Block Bindings',
								link: '/guide/block-bindings',
							},
							{
								text: 'Interactivity',
								link: '/guide/interactivity',
							},
							{ text: 'DataViews', link: '/guide/dataviews' },
							{ text: 'Jobs', link: '/guide/jobs' },
						],
					},
					{
						text: 'Advanced',
						collapsed: true,
						items: [
							{
								text: 'Resources Deep Dive',
								link: '/guide/resources-advanced',
							},
							{
								text: 'Modes (Static/Headless/WP)',
								link: '/guide/modes',
							},
							{
								text: 'Showcase Plugin',
								link: '/guide/showcase',
							},
						],
					},
				],
				'/packages/': [
					{
						text: 'Packages',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/packages/' },
							{
								text: '@geekist/wp-kernel',
								link: '/packages/kernel',
							},
							{
								text: '@geekist/wp-kernel-ui',
								link: '/packages/ui',
							},
							{
								text: '@geekist/wp-kernel-cli',
								link: '/packages/cli',
							},
							{
								text: '@geekist/wp-kernel-e2e-utils',
								link: '/packages/e2e-utils',
							},
						],
					},
				],
				'/api/': [
					{
						text: 'API Reference',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/api/' },
							{ text: 'Resources', link: '/api/resources' },
							{ text: 'Actions', link: '/api/actions' },
							{ text: 'Events', link: '/api/events' },
							{ text: 'Jobs', link: '/api/jobs' },
						],
					},
					{
						text: 'Generated Docs',
						collapsed: true,
						items: [
							{
								text: '@geekist/wp-kernel',
								link: '/api/generated/kernel/src/README',
							},
							{
								text: '@geekist/wp-kernel-cli',
								link: '/api/generated/@geekist/wp-kernel-cli/README',
							},
							{
								text: '@geekist/wp-kernel-ui',
								link: '/api/generated/@geekist/wp-kernel-ui/README',
							},
						],
					},
				],
				'/contributing/': [
					{
						text: 'Contributing',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/contributing/' },
							{ text: 'Roadmap', link: '/contributing/roadmap' },
							{
								text: 'Development Setup',
								link: '/contributing/setup',
							},
							{ text: 'Runbook', link: '/contributing/runbook' },
							{
								text: 'Coding Standards',
								link: '/contributing/standards',
							},
							{ text: 'Testing', link: '/contributing/testing' },
							{
								text: 'E2E Testing',
								link: '/contributing/e2e-testing',
							},
							{
								text: 'Pull Requests',
								link: '/contributing/pull-requests',
							},
						],
					},
				],
			},

			socialLinks: [
				{
					icon: 'github',
					link: 'https://github.com/theGeekist/wp-kernel',
				},
			],
			search: { provider: 'local' },
			footer: {
				message: 'Released under the EUPL-1.2 License.',
				copyright:
					'Made with ❤️ by <a href="https://geekist.co" target="_blank">Geekist</a>',
			},
		},
	})
);
