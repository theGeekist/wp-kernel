module.exports = {
	presets: ['@wordpress/babel-preset-default'],
	plugins: [
		[
			'@babel/plugin-transform-typescript',
			{ allowDeclareFields: true, isTSX: true },
		],
	],
};
