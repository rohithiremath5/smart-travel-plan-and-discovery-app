import { test as base, expect } from '@playwright/test';

// Registered before every page/navigation. A test's explicit provider mocks run first;
// requests without an explicit mock are aborted and fail teardown, never sent.
export const test = base.extend<{ offlineNetwork: void }>({
  offlineNetwork: [
    async ({ context, baseURL }, use, testInfo) => {
      const unexpected: { method: string; origin: string }[] = [];
      const origin = new URL(baseURL!).origin;
      await context.route('**/*', async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        unexpected.push({ method: request.method(), origin: url.origin });
        await route.abort('blockedbyclient');
      });
      await use();
      await testInfo.attach('offline-network-boundary', {
        body: JSON.stringify({ unexpected, liveProviderCalls: 0 }),
        contentType: 'application/json',
      });
      expect(
        unexpected,
        'Every external request must have a deterministic mock; unexpected traffic was blocked.',
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export type { Page, TestInfo, Locator } from '@playwright/test';
