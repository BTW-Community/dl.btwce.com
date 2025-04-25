import { Env, SiteConfig } from './types';

export function getSiteConfig(env: Env, domain: string): SiteConfig | undefined {
	const configs: { [domain: string]: SiteConfig } = {
		'dl.btwce.com': {
			name: "Better Than Wolves Files",
			bucket: env["BUCKET_dl-files"],
			descriptions: {},
			favicon: 'https://wiki.btwce.com/favicon.ico',
			faviconType: 'image/x-icon',
			cacheControl: 'public, max-age=14400',
		},
	};
	return configs[domain];
}
