import type { Plugin } from 'vite';

const FUNCTION_PREFIX = '/.netlify/functions/';

/** Serves netlify/functions/* during `vite` dev; env vars stay server-side (no VITE_ prefix needed). */
export function netlifyFunctionsDev(env: Record<string, string>): Plugin {
    return {
        name: 'netlify-functions-dev',
        apply: 'serve',
        configureServer(server) {
            Object.assign(globalThis, { Netlify: { env: { get: (key: string) => env[key] } } });

            server.middlewares.use(async (req, res, next) => {
                if (!req.url?.startsWith(FUNCTION_PREFIX)) return next();
                const name = req.url.slice(FUNCTION_PREFIX.length).split('?')[0];
                if (!/^[\w-]+$/.test(name)) return next();

                try {
                    const chunks: Buffer[] = [];
                    for await (const chunk of req) chunks.push(chunk as Buffer);
                    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
                    const request = new Request(`http://${req.headers.host}${req.url}`, {
                        method: req.method,
                        headers: req.headers as Record<string, string>,
                        body: hasBody ? Buffer.concat(chunks) : undefined,
                    });
                    const module = await server.ssrLoadModule(`/netlify/functions/${name}.mts`);
                    const response: Response = await module.default(request);
                    res.statusCode = response.status;
                    response.headers.forEach((value, key) => res.setHeader(key, value));
                    res.end(Buffer.from(await response.arrayBuffer()));
                } catch (caught) {
                    server.config.logger.error(String(caught));
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(
                        JSON.stringify({ error: { message: 'The local analysis function failed. See the dev server log.' } }),
                    );
                }
            });
        },
    };
}
