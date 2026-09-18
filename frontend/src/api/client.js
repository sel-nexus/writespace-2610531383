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
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError('Unable to reach WriteSpace.', 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'Request failed.';
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
