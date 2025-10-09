export const VERSION: string =
	typeof process === 'undefined'
		? '0.0.0'
		: (process.env.npm_package_version ?? '0.0.0');
