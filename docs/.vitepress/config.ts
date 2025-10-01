import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'WP Kernel',
	description:
		'A Rails-like, opinionated framework for building modern WordPress products',
	base: '/wp-kernel/',
	lastUpdated: true,
	sitemap: { hostname: 'https://thegeekist.github.io' },
	ignoreDeadLinks: [
		// Ignore localhost URLs (environment-specific)
		/^http:\/\/localhost:\d+/,
	],
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Getting Started', link: '/getting-started/' },
			{ text: 'Guide', link: '/guide/' },
			{ text: 'API', link: '/api/' },
			{ text: 'Contributing', link: '/contributing/' },
		],

		sidebar: {
			'/getting-started/': [
				{
					text: 'Getting Started',
					items: [
						{
							text: 'Introduction',
							link: '/getting-started/',
						},
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
			],
			'/guide/': [
				{
					text: 'Core Concepts',
					items: [
						{ text: 'Overview', link: '/guide/' },
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
						{ text: 'Jobs', link: '/guide/jobs' },
					],
				},
			],
			'/api/': [
				{
					text: 'API Reference',
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
					items: [
						{
							text: 'Resources',
							link: '/api/generated/resource/',
						},
						{
							text: 'Errors',
							link: '/api/generated/errors/',
						},
						{
							text: 'Transport',
							link: '/api/generated/transport/',
						},
					],
				},
			],
			'/contributing/': [
				{
					text: 'Contributing',
					items: [
						{ text: 'Overview', link: '/contributing/' },
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

		search: {
			provider: 'local',
		},

		footer: {
			message: 'Released under the EUPL-1.2 License.',
			copyright: 'Copyright © 2025 Geekist',
		},
	},
});
