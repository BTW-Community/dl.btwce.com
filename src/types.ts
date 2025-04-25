export type Env = {
	[K in `BUCKET_${string}`]: R2Bucket;
};

export interface SiteConfig {
	name: string;
	bucket: R2Bucket;
	descriptions: {
		[path: string]: string;
	};
	favicon: string;
	faviconType: string;
	cacheControl: string;
}
