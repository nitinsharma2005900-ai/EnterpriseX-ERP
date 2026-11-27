'use client';
import { queryClient } from './query';
let refreshing: Promise<void> | null = null;

async function request(endpoint: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('enterprisex_token') : null;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`/api${endpoint}`, { ...options, headers, signal: options.signal || AbortSignal.timeout(60000) });
  if (response.status === 401 && retry && !['/auth/login','/auth/refresh','/auth/logout','/auth/demo-accounts'].includes(endpoint.split('?')[0])) {
    const refreshToken = localStorage.getItem('enterprisex_refresh');
    if (refreshToken) {
      refreshing ||= fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
        .then(async result => {
          const payload = await result.json();
          if (!result.ok) throw Object.assign(new Error('Session expired; sign in again'), { status: result.status });
          localStorage.setItem('enterprisex_token', payload.data.accessToken);
          localStorage.setItem('enterprisex_refresh', payload.data.refreshToken);
        }).finally(() => { refreshing = null; });
      await refreshing;
      return request(endpoint, options, false);
    }
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw Object.assign(new Error(payload?.error?.message || payload?.detail || `Request failed (${response.status})`), { status: response.status });
  }
  return response;
}
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const load = async () => (await request(endpoint, options)).json();
  if (!options.method || options.method === 'GET') return queryClient.fetchQuery({ queryKey: ['api', endpoint], queryFn: load });
  const result = await load();
  await queryClient.invalidateQueries({ queryKey: ['api'] });
  return result;
}
export async function downloadApi(endpoint: string, filename: string) {
  const response = await request(endpoint);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
