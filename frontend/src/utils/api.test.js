import { describe, it, expect } from 'vitest';
import { describeApiError } from './api';

describe('describeApiError', () => {
  it('surfaces the FastAPI detail message', () => {
    const error = new Error('API request failed (503): Service Unavailable');
    error.status = 503;
    error.body = JSON.stringify({ detail: 'GOOGLE_API_KEY is not set.' });

    expect(describeApiError(error)).toBe('GOOGLE_API_KEY is not set.');
  });

  it('explains an expired session rather than showing a raw 401', () => {
    const error = new Error('API request failed (401): Unauthorized');
    error.status = 401;
    error.body = JSON.stringify({ detail: 'Could not validate credentials' });

    expect(describeApiError(error)).toMatch(/sign in/i);
  });

  it('explains an aborted request as a timeout', () => {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';

    expect(describeApiError(error)).toMatch(/too long/i);
  });

  it('falls back to the error message when the body is not JSON', () => {
    const error = new Error('Failed to fetch');
    error.body = '<html>502 Bad Gateway</html>';

    expect(describeApiError(error)).toBe('Failed to fetch');
  });
});
