import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, ApiError } from '../api/http';

const AUTH_KEY = 'atlas-admin-auth';

function mockResponse(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('http.get', () => {
  it('sends GET request', async () => {
    const mock = vi.fn().mockResolvedValue(mockResponse({ code: 0, message: 'ok', data: [{ id: 1 }] }));
    vi.stubGlobal('fetch', mock);

    const result = await http.get('/novels');
    expect(result).toEqual([{ id: 1 }]);
    expect(mock).toHaveBeenCalledWith(
      '/api/v1/b/novels',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('appends query params', async () => {
    const mock = vi.fn().mockResolvedValue(mockResponse({ code: 0, message: 'ok', data: [] }));
    vi.stubGlobal('fetch', mock);

    await http.get('/novels', { page: 1, pageSize: 20 });
    expect(mock.mock.calls[0][0]).toContain('page=1');
  });
});

describe('http.post', () => {
  it('sends POST with JSON body', async () => {
    const mock = vi.fn().mockResolvedValue(mockResponse({ code: 0, message: 'ok', data: null }));
    vi.stubGlobal('fetch', mock);

    await http.post('/novels', { title: '新书' });
    expect(mock).toHaveBeenCalledWith(
      '/api/v1/b/novels',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: '新书' }),
      }),
    );
  });
});

describe('auth token injection', () => {
  it('injects token from localStorage', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ state: { token: 'admin-token' } }));
    const mock = vi.fn().mockResolvedValue(mockResponse({ code: 0, message: 'ok', data: {} }));
    vi.stubGlobal('fetch', mock);

    await http.get('/workbench/kpi');
    const opts = mock.mock.calls[0][1];
    expect(opts.headers['Authorization']).toBe('Bearer admin-token');
  });
});

describe('error handling', () => {
  it('throws ApiError on business error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ code: 403, message: '无权限', traceId: 'x' })));

    await expect(http.get('/novels')).rejects.toThrow('无权限');
  });

  it('throws ApiError on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));
    await expect(http.get('/novels')).rejects.toThrow('网络异常');
  });
});