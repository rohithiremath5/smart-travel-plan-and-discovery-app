// @vitest-environment node
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import type { Connect, ViteDevServer } from 'vite';
import { expect, it, vi } from 'vitest';
import { aiDevelopmentPlugin } from '../../server/ai/dev-plugin';
import { aiInput } from '../fixtures/ai';

it('propagates a real local browser disconnect through Vite, handler and SDK transport without retry/refund', async () => {
  const root = await mkdtemp(join(tmpdir(), 'smart-travel-ai-cancel-'));
  let middleware: Connect.NextHandleFunction | undefined;
  let providerSignal: AbortSignal | undefined;
  const fetcher = vi.fn(async (_url, init: RequestInit | undefined) => {
    providerSignal = init!.signal!;
    return new Promise<Response>((_resolve, reject) =>
      providerSignal!.addEventListener(
        'abort',
        () => reject(new Error('private transport abort')),
        { once: true },
      ),
    );
  });
  vi.stubGlobal('fetch', fetcher);
  const server = createServer((req, res) => {
    middleware!(req, res, () => res.end());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Local fixture server unavailable');
    const hook = aiDevelopmentPlugin(
      { GEMINI_API_KEY: 'synthetic-server-key' },
      root,
    ).configureServer;
    if (typeof hook !== 'function') throw new Error('Development hook unavailable');
    hook.call(
      undefined as never,
      {
        config: { server: { port: address.port } },
        middlewares: {
          use: (_path: string, next: Connect.NextHandleFunction) => {
            middleware = next;
          },
        },
      } as unknown as ViteDevServer,
    );
    const client = request({
      hostname: '127.0.0.1',
      port: address.port,
      path: '/generate',
      method: 'POST',
      headers: { origin: `http://127.0.0.1:${address.port}`, 'content-type': 'application/json' },
    });
    client.on('error', () => {
      /* Expected disconnect, never log request details. */
    });
    client.end(JSON.stringify(aiInput()));
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    client.destroy();
    await vi.waitFor(() => expect(providerSignal?.aborted).toBe(true));
    expect(fetcher).toHaveBeenCalledOnce();
    const ledger = JSON.parse(
      await readFile(join(root, '.cache/ai-development-ledger.json'), 'utf8'),
    );
    expect(ledger.requests).toHaveLength(1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllGlobals();
    for (const file of ['ai-development-ledger.json', 'ai-development-ledger.json.lock'])
      await unlink(join(root, '.cache', file)).catch(() => undefined);
    await rmdir(join(root, '.cache')).catch(() => undefined);
    await rmdir(root);
  }
});
