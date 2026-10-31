export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(
    `${import.meta.env.VITE_API_URL ?? '/api/v1'}${path}`,
    { ...options, headers, credentials: 'include' },
  );
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    refreshPromise ??= apiClient<{ accessToken: string }>(
      '/auth/refresh',
      { method: 'POST' },
      false,
    )
      .then((session) => {
        if (typeof session.accessToken !== 'string')
          throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');
        setAccessToken(session.accessToken);
      })
      .catch((error: unknown) => {
        setAccessToken(null);
        window.dispatchEvent(new Event('brightloop:session-expired'));
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
    await refreshPromise;
    return apiClient<T>(path, options, false);
  }
  if (response.status === 204) return undefined as T;
  if (response.ok && headers.get('Accept') === 'application/pdf')
    return (await response.blob()) as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      isRecord(payload) && isRecord(payload.error) ? payload.error : {};
    throw new ApiError(
      response.status,
      typeof error.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error.message === 'string'
        ? error.message
        : 'The request could not be completed. Please try again.',
      error.details,
    );
  }
  return payload as T;
}
