import type { DefaultTheme } from 'vitepress';

export const configSidebar: DefaultTheme.Sidebar = [
	{
		text: 'Config',
		collapsed: false,
		items: [
			{ text: 'Guide', link: '/reference/config/' },
			{ text: 'Directories', link: '/reference/config/directories' },
			{ text: 'Schemas', link: '/reference/config/schemas' },
			{ text: 'Adapters', link: '/reference/config/adapters' },
			{ text: 'Readiness', link: '/reference/config/readiness' },
			{ text: 'Resources', link: '/reference/config/resources' },
			{ text: 'UI', link: '/reference/config/ui' },
			{ text: 'Appendix', link: '/reference/config/appendix' },
		],
	},
];
