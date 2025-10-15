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
			if (
				page.filePath?.includes('/docs/api/@wpkernel/') ||
				page.filePath?.includes('/docs/api/core/')
			) {
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
				{ text: 'Examples', link: '/examples/' },
				{ text: 'Reference', link: '/reference/contracts' },
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
						text: 'Explore',
						collapsed: true,
						items: [
							{ text: 'Examples', link: '/examples/' },
							{
								text: 'Decision Matrix',
								link: '/reference/decision-matrix',
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
							{ text: 'Blocks', link: '/guide/blocks' },
							{
								text: 'Interactivity',
								link: '/guide/interactivity',
							},
							{ text: 'DataViews', link: '/guide/dataviews' },
							{ text: 'Jobs', link: '/guide/jobs' },
							{ text: 'Policy', link: '/guide/policy' },
						],
					},
					{
						text: 'Deep dives',
						collapsed: true,
						items: [
							{ text: 'Modes', link: '/guide/modes' },
							{ text: 'Prefetching', link: '/guide/prefetching' },
							{ text: 'Reporting', link: '/guide/reporting' },
							{ text: 'Data Utilities', link: '/guide/data' },
						],
					},
				],
				'/examples/': [
					{
						text: 'Examples',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/examples/' },
							{ text: 'Showcase', link: '/examples/showcase' },
							{
								text: 'Test the CLI',
								link: '/examples/test-the-cli',
							},
						],
					},
				],
				'/reference/': [
					{
						text: 'Reference',
						collapsed: false,
						items: [
							{ text: 'Contracts', link: '/reference/contracts' },
							{
								text: 'Kernel Config',
								link: '/reference/kernel-config',
							},
							{
								text: 'Decision Matrix',
								link: '/reference/decision-matrix',
							},
							{
								text: 'CLI Commands',
								link: '/reference/cli-commands',
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
							{ text: 'Reporter', link: '/api/reporter' },
							{ text: 'Policy', link: '/api/policy' },
						],
					},
					{
						text: 'Typedoc output',
						collapsed: true,
						items: [
							{
								text: '@wpkernel/cli',
								link: '/api/@wpkernel/cli/',
							},
							{
								text: '@wpkernel/ui',
								link: '/api/@wpkernel/ui/',
							},
							{ text: '@wpkernel/core', link: '/api/core/src/' },
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
