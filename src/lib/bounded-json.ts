/** Read untrusted JSON without trusting Content-Length, keeping cancellation active through the body. */
export async function readBoundedJson(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<unknown> {
  signal.throwIfAborted();
  if (Number(response.headers.get('content-length')) > maximumBytes) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error('Response exceeds the safe size limit.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is empty.');
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  let bytes = 0,
    text = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > maximumBytes) throw new Error('Response exceeds the safe size limit.');
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

const publicCodes = new Set([
  'origin_denied',
  'method_denied',
  'invalid_public_key',
  'backend_unconfigured',
  'json_required',
  'request_too_large',
  'invalid_request',
  'quota_unavailable',
  'daily_budget',
  'request_busy',
  'cache_unavailable',
  'provider_timeout',
  'provider_quota',
  'provider_unavailable',
  'malformed_provider',
  'route_unavailable',
  'partial_route',
]);
export function publicDiscoveryCode(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'code' in value &&
    typeof value.code === 'string' &&
    publicCodes.has(value.code)
  )
    return value.code;
  return 'unavailable';
}
