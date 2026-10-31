import { afterEach, expect, test, vi } from 'vitest';
import { apiClient, ApiError, setAccessToken } from './api-client';
afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});
test('refreshes an expired token once and retries the protected request', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 401 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ accessToken: 'fresh-token' })),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] })));
  vi.stubGlobal('fetch', fetchMock);
  expect(await apiClient('/subscriptions')).toEqual({ data: [] });
  expect(fetchMock.mock.calls[1]?.[0]).toContain('/auth/refresh');
  const options = fetchMock.mock.calls[2]?.[1] as RequestInit;
  expect(new Headers(options.headers).get('Authorization')).toBe(
    'Bearer fresh-token',
  );
});
test('sends credentials and the memory-only bearer token', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ id: '1' })));
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken('test-token');
  expect(await apiClient('/auth/me')).toEqual({ id: '1' });
  const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(options.credentials).toBe('include');
  expect(new Headers(options.headers).get('Authorization')).toBe(
    'Bearer test-token',
  );
});
test('preserves API error details for field validation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email',
            details: { email: ['Invalid'] },
          },
        }),
        { status: 400 },
      ),
    ),
  );
  await expect(apiClient('/auth/login')).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Invalid email',
    details: { email: ['Invalid'] },
  });
});
test('handles non-JSON failures and empty success responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })),
  );
  await expect(apiClient('/health')).rejects.toBeInstanceOf(ApiError);
  await expect(apiClient('/auth/logout')).resolves.toBeUndefined();
});
