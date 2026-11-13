import { describe, expect, it } from 'vitest';
import { ConfigurationError, readPublicEnvironment } from '../../config/public-env';

describe('public configuration boundary', () => {
  it('works without .env and does not claim future services are live', () => {
    expect(readPublicEnvironment({})).toMatchObject({
      requestedMode: 'auto',
      runtimeMode: 'demo',
      phase: 6,
    });
    expect(
      readPublicEnvironment({ VITE_APP_MODE: 'live', GEOAPIFY_API_KEY: 'private-test-value' }),
    ).toMatchObject({ runtimeMode: 'unavailable' });
  });
  it('exposes only public configuration even when private values exist', () => {
    const value = 'private-fixture-value';
    const config = readPublicEnvironment({
      GEMINI_API_KEY: value,
      SUPABASE_ACCESS_TOKEN: value,
      VITE_SUPABASE_PUBLISHABLE_KEY: ['sb_publishable_', 'synthetic_public_value'].join(''),
    });
    expect(JSON.stringify(config)).not.toContain(value);
    expect(Object.keys(config).sort()).toEqual([
      'aiRequestTimeoutMs',
      'appName',
      'appUrl',
      'phase',
      'publishableKey',
      'requestedMode',
      'runtimeMode',
      'supabaseUrl',
    ]);
  });
  it('rejects accidental public-secret names without printing their values', () => {
    const value = 'sensitive-fixture-value';
    expect(() => readPublicEnvironment({ VITE_GEMINI_API_KEY: value })).toThrow(ConfigurationError);
    try {
      readPublicEnvironment({ VITE_GEMINI_API_KEY: value });
    } catch (error) {
      expect(String(error)).not.toContain(value);
      expect(String(error)).toContain('VITE_GEMINI_API_KEY');
    }
  });
  it.each([
    'invalid',
    'https://example.com/path',
    'http://example.com',
    'https://user:secret@example.com',
    'https://example.com/?next=evil',
  ])('rejects invalid or unsafe origins: %s', (value) => {
    expect(() => readPublicEnvironment({ VITE_APP_URL: value })).toThrow(ConfigurationError);
  });
  it('rejects invalid modes, empty names, and administrative values in a public key field', () => {
    expect(() => readPublicEnvironment({ VITE_APP_MODE: 'paid' })).toThrow();
    expect(() => readPublicEnvironment({ VITE_APP_NAME: '' })).toThrow();
    expect(() =>
      readPublicEnvironment({ VITE_SUPABASE_PUBLISHABLE_KEY: 'administrative-value' }),
    ).toThrow();
  });
});
