import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getHealth, requestJson } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestJson', () => {
  it('returns the health response from the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'ok' }),
    }));

    await expect(getHealth()).resolves.toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      headers: { Accept: 'application/json' },
    }));
  });

  it('normalizes an HTTP error into ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ error: 'Service temporarily unavailable.' }),
    }));

    await expect(requestJson('/api/health')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'Service temporarily unavailable.',
        status: 503,
      }),
    );
  });

  it('normalizes a network failure into ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));

    await expect(requestJson('/api/health')).rejects.toBeInstanceOf(ApiError);
    await expect(requestJson('/api/health')).rejects.toMatchObject({ status: 0 });
  });
});
