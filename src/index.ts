import { Env, SiteConfig } from './types';
import { renderTemplFull } from './render';
import { getSiteConfig } from './config';

async function listBucket(bucket: R2Bucket, options?: R2ListOptions): Promise<R2Objects> {
	// List all objects in the bucket, launch new request if list is truncated
	const objects: R2Object[] = [];
	const delimitedPrefixes: string[] = [];

	// delete limit, cursor in passed options
	const requestOptions = {
		...options,
		limit: undefined,
		cursor: undefined,
	};

	var cursor = undefined;
	while (true) {
		const index = await bucket.list({
			...requestOptions,
			cursor,
		});
		objects.push(...index.objects);
		delimitedPrefixes.push(...index.delimitedPrefixes);
		if (!index.truncated) {
			break;
		}
		cursor = index.cursor;
	}
	return {
		objects,
		delimitedPrefixes,
		truncated: false,
	};
}

function shouldReturnOriginResponse(originResponse: Response, siteConfig: SiteConfig): boolean {
	const isNotEndWithSlash = originResponse.url.slice(-1) !== '/';
	const is404 = originResponse.status === 404;
	return isNotEndWithSlash || !is404;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const originResponse = await fetch(request);

		const url = new URL(request.url);
		const domain = url.hostname;
		const path = url.pathname;

		const siteConfig = getSiteConfig(env, domain);
		if (!siteConfig) {
			return originResponse;
		}
		// remove the leading '/'
		const objectKey = decodeURIComponent(path.slice(1));

		if (shouldReturnOriginResponse(originResponse, siteConfig)) {
			return originResponse;
		}

		const bucket = siteConfig.bucket;
		const index = await listBucket(bucket, {
			prefix: objectKey,
			delimiter: '/',
			include: ['httpMetadata', 'customMetadata'],
		});
		// filter out key===prefix
		const files = index.objects.filter((obj) => obj.key !== objectKey);
		const folders = index.delimitedPrefixes.filter((prefix) => prefix !== objectKey);
		// If no object found, return origin 404 response. Only return 404 because if there is a zero byte object,
		// user may want to show a empty folder.
		if (files.length === 0 && folders.length === 0 && originResponse.status === 404) {
			return originResponse;
		}
		return new Response(renderTemplFull(files, folders, '/' + objectKey, siteConfig), {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': siteConfig.cacheControl,
			},
			status: 200,
		});
	},
};
