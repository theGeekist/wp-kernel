/**
 * Webpack configuration for WP Kernel Showcase
 *
 * Extends @wordpress/scripts default config to ensure WordPress packages
 * are treated as externals for Script Modules.
 */
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const DependencyExtractionWebpackPlugin = require('@wordpress/dependency-extraction-webpack-plugin');

module.exports = {
	...defaultConfig,
	plugins: [
		...defaultConfig.plugins.filter(
			(plugin) =>
				plugin.constructor.name !== 'DependencyExtractionWebpackPlugin'
		),
		new DependencyExtractionWebpackPlugin({
			injectPolyfill: false,
			requestToExternal(request) {
				if (request.startsWith('@wordpress/')) {
					return ['wp', request.substring(11).replace(/\//g, '')];
				}
			},
			requestToHandle(request) {
				if (request.startsWith('@wordpress/')) {
					return 'wp-' + request.substring(11).replace(/\//g, '-');
				}
			},
		}),
	],
};
