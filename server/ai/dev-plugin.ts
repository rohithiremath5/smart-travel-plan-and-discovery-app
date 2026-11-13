import { randomBytes } from 'node:crypto';
import type { Plugin } from 'vite';
import { aiConfig } from '../../supabase/functions/_shared/ai/config.ts';
import { createAiHandler } from '../../supabase/functions/_shared/ai/handler.ts';
import { localAiQuota } from './local-quota.ts';

export function isLocalAiRequest(address: string, host: string, origin: string) {
  return (
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) &&
    /^(?:127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host) &&
    origin === `http://${host}`
  );
}

export function aiDevelopmentPlugin(environment: Record<string, string>, root: string): Plugin {
  return {
    name: 'controlled-local-ai',
    apply: 'serve',
    configureServer(server) {
      const port = server.config.server.port ?? 5173;
      const config = aiConfig({
        ...environment,
        AI_DEVELOPMENT_TOKEN: randomBytes(32).toString('hex'),
        FUNCTION_ALLOWED_ORIGINS: `http://localhost:${port},http://127.0.0.1:${port},http://[::1]:${port}`,
      });
      const handler = createAiHandler(config, localAiQuota(root));
      server.middlewares.use('/api/ai', async (req, res) => {
        const address = req.socket.remoteAddress ?? '';
        const host = req.headers.host ?? '';
        const origin =
          req.headers.origin ??
          (req.method === 'GET' && req.headers['sec-fetch-site'] === 'same-origin'
            ? `http://${host}`
            : '');
        // Loopback binding/network address + exact Host and Origin protect against off-device access and DNS rebinding.
        if (!isLocalAiRequest(address, host, origin)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'development_only' }));
          return;
        }
        if (!['/status', '/generate'].includes((req.url ?? '').split('?')[0]!)) {
          res.writeHead(404);
          res.end();
          return;
        }
        const method = req.method ?? 'GET';
        if (
          (req.url?.startsWith('/status') && method !== 'GET') ||
          (req.url?.startsWith('/generate') && method !== 'POST')
        ) {
          res.writeHead(405);
          res.end();
          return;
        }
        const abort = new AbortController();
        req.on('aborted', () => abort.abort());
        res.on('close', () => {
          if (!res.writableEnded) abort.abort();
        });
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const raw of req) {
            const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            size += chunk.length;
            if (size > 24576) {
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'request_too_large' }));
              return;
            }
            chunks.push(chunk);
          }
          const headers = {
            Origin: origin,
            Authorization: `Bearer ${config.developmentToken}`,
            'Content-Type': String(req.headers['content-type'] ?? ''),
          };
          const response = await handler(
            new Request(`http://${host}/api/ai`, {
              method,
              headers,
              ...(method === 'POST' ? { body: Buffer.concat(chunks).toString('utf8') } : {}),
              signal: abort.signal,
            }),
          );
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch {
          if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'ai_unavailable' }));
        }
      });
    },
  };
}
