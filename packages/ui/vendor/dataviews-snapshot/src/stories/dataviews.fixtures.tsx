/**
 * WordPress dependencies
 */
import { trash, image, Icon, category } from '@wordpress/icons';
import {
	Button,
	__experimentalText as Text,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import type { Field, Action } from '../types';

export type Theme = {
	slug: string;
	name: string;
	description: string;
	requires: string;
	tested: string;
	tags: string[];
};

export type SpaceObject = {
	id: number;
	name: {
		title: string;
		description: string;
	};
	image: string;
	type: string;
	isPlanet: boolean;
	categories: string[];
	satellites: number;
	date: string;
	datetime: string;
	email: string;
};

export const data: SpaceObject[] = [
	{
		id: 1,
		name: {
			title: 'Moon',
			description:
				"The Moon is Earth's only natural satellite, orbiting at an average distance of 384,400 kilometers with a synchronous rotation that leads to fixed lunar phases as seen from Earth. Its cratered surface and subtle glow define night skies, inspiring exploration missions and influencing tides and biological rhythms worldwide.",
		},
		image: 'https://live.staticflickr.com/7398/9458193857_e1256123e3_z.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Earth', 'Moon'],
		satellites: 0,
		date: '2021-01-01',
		datetime: '2021-01-01T14:30:00Z',
		email: 'moon@example.com',
	},
	{
		id: 2,
		name: {
			title: 'Io',
			description: 'Moon of Jupiter',
		},
		image: 'https://live.staticflickr.com/5482/9460973502_07e8ab81fe_z.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Jupiter', 'Moon'],
		satellites: 0,
		date: '2019-01-02',
		datetime: '2019-01-02T09:15:00Z',
		email: 'io@example.com',
	},
	{
		id: 3,
		name: {
			title: 'Europa',
			description: 'Moon of Jupiter',
		},
		image: 'https://live.staticflickr.com/65535/31499273012_baf5f38cc1_z.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Jupiter', 'Moon'],
		satellites: 0,
		date: '2025-01-03',
		datetime: '2025-01-03T16:45:30Z',
		email: 'europa@example.com',
	},
	{
		id: 4,
		name: {
			title: 'Ganymede',
			description: 'Largest moon of Jupiter',
		},
		image: 'https://live.staticflickr.com/7816/33436473218_a836235935_k.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Jupiter', 'Moon'],
		satellites: 0,
		date: '2022-01-04',
		datetime: '2022-01-04T12:30:00Z',
		email: 'ganymede@example.com',
	},
	{
		id: 5,
		name: {
			title: 'Callisto',
			description: 'Outermost Galilean moon of Jupiter',
		},
		image: 'https://live.staticflickr.com/804/27604150528_4512448a9c_c.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Jupiter', 'Moon'],
		satellites: 0,
		date: '2021-01-05',
		datetime: '2021-01-05T14:15:30Z',
		email: 'callisto@example.com',
	},
	{
		id: 6,
		name: {
			title: 'Amalthea',
			description: 'Small irregular moon of Jupiter',
		},
		image: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Amalthea.gif',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Jupiter', 'Moon'],
		satellites: 0,
		date: '2020-01-06',
		datetime: '2020-01-06T10:45:15Z',
		email: 'amalthea@example.com',
	},
	{
		id: 7,
		name: {
			title: 'Himalia',
			description: 'Largest irregular moon of Jupiter',
		},
		image: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Cassini-Huygens_Image_of_Himalia.png',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Jupiter', 'Moon'],
		satellites: 0,
		date: '2019-01-07',
		datetime: '2019-01-07T16:20:45Z',
		email: 'himalia@example.com',
	},
	{
		id: 8,
		name: {
			title: 'Neptune',
			description: 'Ice giant in the Solar system',
		},
		image: 'https://live.staticflickr.com/65535/29523683990_000ff4720c_z.jpg',
		type: 'Ice giant',
		isPlanet: true,
		categories: ['Ice giant', 'Planet', 'Solar system'],
		satellites: 16,
		date: '2020-01-01',
		datetime: '2020-01-01T11:22:15Z',
		email: 'neptune@example.com',
	},
	{
		id: 9,
		name: {
			title: 'Triton',
			description: 'Largest moon of Neptune',
		},
		image: 'https://live.staticflickr.com/65535/50728384241_02c5126c30_h.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Neptune', 'Moon'],
		satellites: 0,
		date: '2021-02-01',
		datetime: '2021-02-01T11:30:00Z',
		email: 'triton@example.com',
	},
	{
		id: 10,
		name: {
			title: 'Nereid',
			description: 'Irregular moon of Neptune',
		},
		image: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Nereid-Voyager2.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Neptune', 'Moon'],
		satellites: 0,
		date: '2020-02-02',
		datetime: '2020-02-02T15:45:30Z',
		email: 'nereid@example.com',
	},
	{
		id: 11,
		name: {
			title: 'Proteus',
			description: 'Second-largest moon of Neptune',
		},
		image: 'https://live.staticflickr.com/65535/50727825808_bf427e007b_c.jpg',
		type: 'Satellite',
		isPlanet: false,
		categories: ['Solar system', 'Satellite', 'Neptune', 'Moon'],
		satellites: 0,
		date: '2019-02-03',
		datetime: '2019-02-03T09:20:15Z',
		email: 'proteus@example.com',
	},
	{
		id: 12,
		name: {
			title: 'Mercury',
			description: 'Terrestrial planet in the Solar system',
		},
		image: 'https://live.staticflickr.com/813/40199101735_e5e92ffd11_z.jpg',
		type: 'Terrestrial',
		isPlanet: true,
		categories: ['Terrestrial', 'Planet', 'Solar system'],
		satellites: 0,
		date: '2020-01-02',
		datetime: '2020-01-02T13:05:45Z',
		email: 'mercury@example.com',
	},
	{
		id: 13,
		name: {
			title: 'Venus',
			description: 'La planète Vénus',
		},
		image: 'https://live.staticflickr.com/8025/7544560662_900e717727_z.jpg',
		type: 'Terrestrial',
		isPlanet: true,
		categories: ['Terrestrial', 'Planet', 'Solar system'],
		satellites: 0,
		date: '2020-01-02',
		datetime: '2020-01-02T08:30:12Z',
		email: 'venus@example.com',
	},
	{
		id: 14,
		name: {
			title: 'Earth',
			description: 'Terrestrial planet in the Solar system',
		},
		image: 'https://live.staticflickr.com/3762/9460163562_964fe6af07_z.jpg',
		type: 'Terrestrial',
		isPlanet: true,
		categories: ['Terrestrial', 'Planet', 'Solar system', 'Earth'],
		satellites: 1,
		date: '2023-01-03',
		datetime: '2023-01-03T18:15:30Z',
		email: 'earth@example.com',
	},
	{
		id: 15,
		name: {
			title: 'Mars',
			description: 'Terrestrial planet in the Solar system',
		},
		image: 'https://live.staticflickr.com/8151/7651156426_e047f4d219_z.jpg',
		type: 'Terrestrial',
		isPlanet: true,
		categories: ['Terrestrial', 'Planet', 'Solar system'],
		satellites: 2,
		date: '2020-01-01',
		datetime: '2020-01-01T20:45:00Z',
		email: 'mars@example.com',
	},
	{
		id: 16,
		name: {
			title: 'Jupiter',
			description: 'Gas giant in the Solar system',
		},
		image: 'https://staging-jubilee.flickr.com/2853/9458010071_6e6fc41408_z.jpg',
		type: 'Gas giant',
		isPlanet: true,
		categories: ['Solar system', 'Planet', 'Gas giant'],
		satellites: 97,
		date: '2017-01-01',
		datetime: '2017-01-01T00:01:00Z',
		email: 'jupiter@example.com',
	},
	{
		id: 17,
		name: {
			title: 'Saturn',
			description: 'Gas giant in the Solar system',
		},
		image: 'https://live.staticflickr.com/5524/9464658509_fc2d83dff5_z.jpg',
		type: 'Gas giant',
		isPlanet: true,
		categories: ['Gas giant', 'Solar system', 'Planet'],
		satellites: 274,
		date: '2020-02-01',
		datetime: '2020-02-01T00:02:00Z',
		email: 'saturn@example.com',
	},
	{
		id: 18,
		name: {
			title: 'Uranus',
			description: 'Ice giant in the Solar system',
		},
		image: 'https://live.staticflickr.com/65535/5553350875_3072df91e2_c.jpg',
		type: 'Ice giant',
		isPlanet: true,
		categories: ['Planet', 'Ice giant', 'Solar system'],
		satellites: 28,
		date: '2020-03-01',
		datetime: '2020-03-01T10:15:20Z',
		email: 'uranus@example.com',
	},
];

export const themeData: Theme[] = [
	{
		slug: 'twentyeleven',
		name: 'Twenty Eleven',
		description:
			'The 2011 theme for WordPress is sophisticated, lightweight, and adaptable. Make it yours with a custom menu, header image, and background -- then go further with available theme options for light or dark color scheme, custom link colors, and three layout choices. Twenty Eleven comes equipped with a Showcase page template that transforms your front page into a showcase to show off your best content, widget support galore (sidebar, three footer areas, and a Showcase page widget area), and a custom "Ephemera" widget to display your Aside, Link, Quote, or Status posts. Included are styles for print and for the admin editor, support for featured images (as custom header images on posts and pages and as large images on featured "sticky" posts), and special styles for six different post formats.',
		requires: '3.2',
		tested: '6.6',
		tags: [
			'blog',
			'one-column',
			'two-columns',
			'left-sidebar',
			'right-sidebar',
			'custom-background',
			'custom-colors',
			'custom-header',
			'custom-menu',
			'editor-style',
			'featured-image-header',
			'featured-images',
			'flexible-header',
			'footer-widgets',
			'full-width-template',
			'microformats',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'theme-options',
			'translation-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentyfifteen',
		name: 'Twenty Fifteen',
		description:
			"Our 2015 default theme is clean, blog-focused, and designed for clarity. Twenty Fifteen's simple, straightforward typography is readable on a wide variety of screen sizes, and suitable for multiple languages. We designed it using a mobile-first approach, meaning your content takes center-stage, regardless of whether your visitors arrive by smartphone, tablet, laptop, or desktop computer.",
		requires: '4.1',
		tested: '6.6',
		tags: [
			'blog',
			'two-columns',
			'left-sidebar',
			'accessibility-ready',
			'custom-background',
			'custom-colors',
			'custom-header',
			'custom-logo',
			'custom-menu',
			'editor-style',
			'featured-images',
			'microformats',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'translation-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentyfourteen',
		name: 'Twenty Fourteen',
		description:
			"In 2014, our default theme lets you create a responsive magazine website with a sleek, modern design. Feature your favorite homepage content in either a grid or a slider. Use the three widget areas to customize your website, and change your content's layout with a full-width page template and a contributor page to show off your authors. Creating a magazine website with WordPress has never been easier.",
		requires: '3.6',
		tested: '6.6',
		tags: [
			'blog',
			'news',
			'two-columns',
			'three-columns',
			'left-sidebar',
			'right-sidebar',
			'custom-background',
			'custom-header',
			'custom-menu',
			'editor-style',
			'featured-images',
			'flexible-header',
			'footer-widgets',
			'full-width-template',
			'microformats',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'theme-options',
			'translation-ready',
			'accessibility-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentynineteen',
		name: 'Twenty Nineteen',
		description:
			"Our 2019 default theme is designed to show off the power of the block editor. It features custom styles for all the default blocks, and is built so that what you see in the editor looks like what you'll see on your website. Twenty Nineteen is designed to be adaptable to a wide range of websites, whether you’re running a photo blog, launching a new business, or supporting a non-profit. Featuring ample whitespace and modern sans-serif headlines paired with classic serif body text, it's built to be beautiful on all screen sizes.",
		requires: '4.7',
		tested: '6.6',
		tags: [
			'one-column',
			'accessibility-ready',
			'custom-colors',
			'custom-menu',
			'custom-logo',
			'editor-style',
			'featured-images',
			'footer-widgets',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'translation-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentyseventeen',
		name: 'Twenty Seventeen',
		description:
			'Twenty Seventeen brings your site to life with header video and immersive featured images. With a focus on business sites, it features multiple sections on the front page as well as widgets, navigation and social menus, a logo, and more. Personalize its asymmetrical grid with a custom color scheme and showcase your multimedia content with post formats. Our default theme for 2017 works great in many languages, for any abilities, and on any device.',
		requires: '4.7',
		tested: '6.6',
		tags: [
			'one-column',
			'two-columns',
			'right-sidebar',
			'flexible-header',
			'accessibility-ready',
			'custom-colors',
			'custom-header',
			'custom-menu',
			'custom-logo',
			'editor-style',
			'featured-images',
			'footer-widgets',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'theme-options',
			'threaded-comments',
			'translation-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentysixteen',
		name: 'Twenty Sixteen',
		description:
			'Twenty Sixteen is a modernized take on an ever-popular WordPress layout — the horizontal masthead with an optional right sidebar that works perfectly for blogs and websites. It has custom color options with beautiful default color schemes, a harmonious fluid grid using a mobile-first approach, and impeccable polish in every detail. Twenty Sixteen will make your WordPress look beautiful everywhere.',
		requires: '4.4',
		tested: '6.6',
		tags: [
			'one-column',
			'two-columns',
			'right-sidebar',
			'accessibility-ready',
			'custom-background',
			'custom-colors',
			'custom-header',
			'custom-menu',
			'editor-style',
			'featured-images',
			'flexible-header',
			'microformats',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'translation-ready',
			'blog',
			'block-patterns',
		],
	},
	{
		slug: 'twentyten',
		name: 'Twenty Ten',
		description:
			'The 2010 theme for WordPress is stylish, customizable, simple, and readable -- make it yours with a custom menu, header image, and background. Twenty Ten supports six widgetized areas (two in the sidebar, four in the footer) and featured images (thumbnails for gallery posts and custom header images for posts and pages). It includes stylesheets for print and the admin Visual Editor, special styles for posts in the "Asides" and "Gallery" categories, and has an optional one-column page template that removes the sidebar.',
		requires: '5.6',
		tested: '6.6',
		tags: [
			'blog',
			'two-columns',
			'custom-header',
			'custom-background',
			'threaded-comments',
			'sticky-post',
			'translation-ready',
			'microformats',
			'rtl-language-support',
			'editor-style',
			'custom-menu',
			'flexible-header',
			'featured-images',
			'footer-widgets',
			'featured-image-header',
			'block-patterns',
		],
	},
	{
		slug: 'twentythirteen',
		name: 'Twenty Thirteen',
		description:
			'The 2013 theme for WordPress takes us back to the blog, featuring a full range of post formats, each displayed beautifully in their own unique way. Design details abound, starting with a vibrant color scheme and matching header images, beautiful typography and icons, and a flexible layout that looks great on any device, big or small.',
		requires: '3.6',
		tested: '6.6',
		tags: [
			'blog',
			'one-column',
			'two-columns',
			'right-sidebar',
			'custom-header',
			'custom-menu',
			'editor-style',
			'featured-images',
			'footer-widgets',
			'microformats',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'translation-ready',
			'accessibility-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentytwelve',
		name: 'Twenty Twelve',
		description:
			'The 2012 theme for WordPress is a fully responsive theme that looks great on any device. Features include a front page template with its own widgets, an optional display font, styling for post formats on both index and single views, and an optional no-sidebar page template. Make it yours with a custom menu, header image, and background.',
		requires: '3.5',
		tested: '6.6',
		tags: [
			'blog',
			'one-column',
			'two-columns',
			'right-sidebar',
			'custom-background',
			'custom-header',
			'custom-menu',
			'editor-style',
			'featured-images',
			'flexible-header',
			'footer-widgets',
			'full-width-template',
			'microformats',
			'post-formats',
			'rtl-language-support',
			'sticky-post',
			'theme-options',
			'translation-ready',
			'block-patterns',
		],
	},
	{
		slug: 'twentytwenty',
		name: 'Twenty Twenty',
		description:
			'Our default theme for 2020 is designed to take full advantage of the flexibility of the block editor. Organizations and businesses have the ability to create dynamic landing pages with endless layouts using the group and column blocks. The centered content column and fine-tuned typography also makes it perfect for traditional blogs. Complete editor styles give you a good idea of what your content will look like, even before you publish. You can give your site a personal touch by changing the background colors and the accent color in the Customizer. The colors of all elements on your site are automatically calculated based on the colors you pick, ensuring a high, accessible color contrast for your visitors.',
		requires: '4.7',
		tested: '6.6',
		tags: [
			'blog',
			'one-column',
			'custom-background',
			'custom-colors',
			'custom-logo',
			'custom-menu',
			'editor-style',
			'featured-images',
			'footer-widgets',
			'full-width-template',
			'rtl-language-support',
			'sticky-post',
			'theme-options',
			'threaded-comments',
			'translation-ready',
			'block-patterns',
			'block-styles',
			'wide-blocks',
			'accessibility-ready',
		],
	},
	{
		slug: 'twentytwentyfour',
		name: 'Twenty Twenty-Four',
		description:
			'Twenty Twenty-Four is designed to be flexible, versatile and applicable to any website. Its collection of templates and patterns tailor to different needs, such as presenting a business, blogging and writing or showcasing work. A multitude of possibilities open up with just a few adjustments to color and typography. Twenty Twenty-Four comes with style variations and full page designs to help speed up the site building process, is fully compatible with the site editor, and takes advantage of new design tools introduced in WordPress 6.4.',
		requires: '6.4',
		tested: '6.6',
		tags: [
			'one-column',
			'custom-colors',
			'custom-menu',
			'custom-logo',
			'editor-style',
			'featured-images',
			'full-site-editing',
			'block-patterns',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'translation-ready',
			'wide-blocks',
			'block-styles',
			'style-variations',
			'accessibility-ready',
			'blog',
			'portfolio',
			'news',
		],
	},
	{
		slug: 'twentytwentyone',
		name: 'Twenty Twenty-One',
		description:
			'Twenty Twenty-One is a blank canvas for your ideas and it makes the block editor your best brush. With new block patterns, which allow you to create a beautiful layout in a matter of seconds, this theme’s soft colors and eye-catching — yet timeless — design will let your work shine. Take it for a spin! See how Twenty Twenty-One elevates your portfolio, business website, or personal blog.',
		requires: '5.3',
		tested: '6.6',
		tags: [
			'one-column',
			'accessibility-ready',
			'custom-colors',
			'custom-menu',
			'custom-logo',
			'editor-style',
			'featured-images',
			'footer-widgets',
			'block-patterns',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'translation-ready',
			'blog',
			'portfolio',
		],
	},
	{
		slug: 'twentytwentythree',
		name: 'Twenty Twenty-Three',
		description:
			'Twenty Twenty-Three is designed to take advantage of the new design tools introduced in WordPress 6.1. With a clean, blank base as a starting point, this default theme includes ten diverse style variations created by members of the WordPress community. Whether you want to build a complex or incredibly simple website, you can do it quickly and intuitively through the bundled styles or dive into creation and full customization yourself.',
		requires: '6.1',
		tested: '6.6',
		tags: [
			'one-column',
			'custom-colors',
			'custom-menu',
			'custom-logo',
			'editor-style',
			'featured-images',
			'full-site-editing',
			'block-patterns',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'translation-ready',
			'wide-blocks',
			'block-styles',
			'style-variations',
			'accessibility-ready',
			'blog',
			'portfolio',
			'news',
		],
	},
	{
		slug: 'twentytwentytwo',
		name: 'Twenty Twenty-Two',
		description:
			'Built on a solidly designed foundation, Twenty Twenty-Two embraces the idea that everyone deserves a truly unique website. The theme’s subtle styles are inspired by the diversity and versatility of birds: its typography is lightweight yet strong, its color palette is drawn from nature, and its layout elements sit gently on the page. The true richness of Twenty Twenty-Two lies in its opportunity for customization. The theme is built to take advantage of the Site Editor features introduced in WordPress 5.9, which means that colors, typography, and the layout of every single page on your site can be customized to suit your vision. It also includes dozens of block patterns, opening the door to a wide range of professionally designed layouts in just a few clicks. Whether you’re building a single-page website, a blog, a business website, or a portfolio, Twenty Twenty-Two will help you create a site that is uniquely yours.',
		requires: '5.9',
		tested: '6.6',
		tags: [
			'one-column',
			'custom-colors',
			'custom-menu',
			'custom-logo',
			'editor-style',
			'featured-images',
			'full-site-editing',
			'block-patterns',
			'rtl-language-support',
			'sticky-post',
			'threaded-comments',
			'style-variations',
			'wide-blocks',
			'block-styles',
			'accessibility-ready',
			'blog',
			'portfolio',
			'news',
		],
	},
];

export const themeFields: Field<Theme>[] = [
	{ id: 'slug', label: 'Slug' },
	{ id: 'name', label: 'Name' },
	{
		id: 'description',
		label: 'Description',
		render: ({ item }) => (
			<span className="theme-field-description">{item.description}</span>
		),
	},
	{ id: 'requires', label: 'Requires at least' },
	{ id: 'tested', label: 'Tested up to' },
	{ id: 'icon', label: 'Icon', render: () => <Icon icon={image} /> },
	{
		id: 'tags',
		label: 'Tags',
		type: 'array',
	},
];

export const DEFAULT_VIEW = {
	type: 'table' as const,
	search: '',
	page: 1,
	perPage: 10,
	layout: {
		styles: {
			satellites: {
				align: 'end' as const,
			},
		},
	},
	filters: [],
};

export const actions: Action<SpaceObject>[] = [
	{
		id: 'delete',
		label: 'Delete item',
		isPrimary: true,
		icon: trash,
		hideModalHeader: true,
		modalFocusOnMount: 'firstContentElement',
		supportsBulk: true,
		RenderModal: ({ items, closeModal }) => {
			return (
				<VStack spacing="5">
					<Text>
						{`Are you sure you want to delete "${items[0].name.title}"?`}
					</Text>
					<HStack justify="right">
						<Button
							__next40pxDefaultSize
							variant="tertiary"
							onClick={closeModal}
						>
							Cancel
						</Button>
						<Button
							__next40pxDefaultSize
							variant="primary"
							onClick={closeModal}
						>
							Delete
						</Button>
					</HStack>
				</VStack>
			);
		},
	},
	{
		id: 'secondary',
		label: 'Secondary action',
		callback() {},
	},
];

export const fields: Field<SpaceObject>[] = [
	{
		label: 'Image',
		id: 'image',
		type: 'media',
		header: (
			<HStack spacing={1} justify="start">
				<Icon icon={image} />
				<span>Image</span>
			</HStack>
		),
		render: ({ item }) => {
			return <img src={item.image} alt="" style={{ width: '100%' }} />;
		},
	},
	{
		label: 'Title',
		id: 'title',
		type: 'text',
		enableHiding: true,
		enableGlobalSearch: true,
		filterBy: {
			operators: ['contains', 'notContains', 'startsWith'],
		},
		isValid: {
			required: true,
		},
		getValue: ({ item }) => item.name.title,
		setValue: ({ value }) => ({
			name: {
				title: value,
			},
		}),
	},
	{
		id: 'date',
		label: 'Date',
		type: 'date',
	},
	{
		id: 'datetime',
		label: 'Datetime',
		type: 'datetime',
	},
	{
		label: 'Type',
		id: 'type',
		enableHiding: false,
		elements: [
			{ value: 'Satellite', label: 'Satellite' },
			{ value: 'Ice giant', label: 'Ice giant' },
			{ value: 'Terrestrial', label: 'Terrestrial' },
			{ value: 'Gas giant', label: 'Gas giant' },
			{ value: 'Dwarf planet', label: 'Dwarf planet' },
			{ value: 'Asteroid', label: 'Asteroid' },
			{ value: 'Comet', label: 'Comet' },
			{ value: 'Kuiper belt object', label: 'Kuiper belt object' },
			{ value: 'Protoplanet', label: 'Protoplanet' },
			{ value: 'Planetesimal', label: 'Planetesimal' },
			{ value: 'Minor planet', label: 'Minor planet' },
			{
				value: 'Trans-Neptunian object',
				label: 'Trans-Neptunian object',
			},
		],
		filterBy: {
			operators: ['is', 'isNot'],
		},
	},
	{
		id: 'isPlanet',
		label: 'Is Planet',
		type: 'boolean',
		setValue: ({ value }) => ({
			isPlanet: value === 'true',
		}),
		elements: [
			{ value: true, label: 'True' },
			{ value: false, label: 'False' },
		],
	},
	{
		label: 'Satellites',
		id: 'satellites',
		type: 'integer',
		enableSorting: true,
	},
	{
		label: 'Description',
		id: 'description',
		type: 'text',
		enableSorting: false,
		enableGlobalSearch: true,
		filterBy: {
			operators: ['contains', 'notContains', 'startsWith'],
		},
		getValue: ({ item }) => item.name.description,
		setValue: ({ value }) => ({
			name: {
				description: value,
			},
		}),
	},
	{
		label: 'Email',
		id: 'email',
		type: 'email',
	},
	{
		label: 'Categories',
		id: 'categories',
		header: (
			<HStack spacing={1} justify="start">
				<Icon icon={category} />
				<span>Categories</span>
			</HStack>
		),
		elements: [
			{ value: 'Solar system', label: 'Solar system' },
			{ value: 'Satellite', label: 'Satellite' },
			{ value: 'Moon', label: 'Moon' },
			{ value: 'Earth', label: 'Earth' },
			{ value: 'Jupiter', label: 'Jupiter' },
			{ value: 'Planet', label: 'Planet' },
			{ value: 'Ice giant', label: 'Ice giant' },
			{ value: 'Terrestrial', label: 'Terrestrial' },
			{ value: 'Gas giant', label: 'Gas giant' },
		],
		type: 'array',
		enableGlobalSearch: true,
	},
];
