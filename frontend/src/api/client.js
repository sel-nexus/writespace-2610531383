/**
 * Normalize unknown API failures into a consistently consumable error.
 */
export class ApiError extends Error {
  /**
   * Create an API error.
   *
   * @param {string} message Human-safe failure description.
   * @param {number} status HTTP status, or zero when no response arrived.
   */
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Request JSON from the same-origin API while normalizing failure shapes.
 *
 * @param {string} path API path beginning with a slash.
 * @param {RequestInit} [options] Fetch options.
 * @returns {Promise<unknown>} Parsed JSON response.
 * @throws {ApiError} When the server or transport reports a failure.
 */
export async function requestJson(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL ?? '';
  const { token, body, headers, ...requestOptions } = options;
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('Unable to reach WriteSpace.', 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const envelope = typeof payload.error === 'object' && payload.error ? payload.error : null;
    const message = envelope?.message || (typeof payload.error === 'string' ? payload.error : 'Request failed.');
    throw new ApiError(message, response.status);
  }

  return payload;
}

/**
 * Read the live backend status.
 *
 * @returns {Promise<{status: string}>} Health status supplied by the API.
 */
export function getHealth() {
  return requestJson('/api/health');
}

/**
 * Read a bounded set of anonymous-safe public post summaries.
 *
 * @param {number} [limit=3] Number of summaries requested from the public feed.
 * @returns {Promise<Array<{id: string, title: string, excerpt: string, created_at: string}>>} Safe post previews.
 */
export function getPublicPosts(limit = 3) {
  return requestJson(`/api/public/posts?limit=${encodeURIComponent(limit)}`);
}
