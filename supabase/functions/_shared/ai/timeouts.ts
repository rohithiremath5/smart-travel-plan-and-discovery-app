/** Bounded below the Supabase Free 150-second wall/idle limits; never retry. */
export function aiTimeouts(providerMs = 75_000) {
  return { providerMs, handlerMs: providerMs + 5_000, browserMs: providerMs + 10_000 };
}
export function validAiTimeouts(timeouts: ReturnType<typeof aiTimeouts>): boolean {
  return (
    Number.isInteger(timeouts.providerMs) &&
    timeouts.providerMs >= 1_000 &&
    timeouts.providerMs <= 100_000 &&
    timeouts.handlerMs === timeouts.providerMs + 5_000 &&
    timeouts.browserMs === timeouts.handlerMs + 5_000
  );
}
/** Clear timers/listeners on completion; callers must dispose in finally. */
export function aiDeadline(parent: AbortSignal, milliseconds: number) {
  const controller = new AbortController();
  const signal = AbortSignal.any([parent, controller.signal]);
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const clear = () => clearTimeout(timer);
  signal.addEventListener('abort', clear, { once: true });
  if (signal.aborted) clear();
  return {
    signal,
    dispose() {
      clear();
      signal.removeEventListener('abort', clear);
    },
  };
}
/** Bound even an adapter/stream that ignores cancellation; never start after abort. */
export function aiAbortable<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(new DOMException('AI request cancelled', 'AbortError'));
    };
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return run();
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}
