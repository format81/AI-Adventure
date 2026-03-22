const BASE = '/api';

export async function apiFetch(path, options = {}) {
  const token = (() => {
    try {
      const stored = localStorage.getItem('ai-avventura-auth');
      if (stored) return JSON.parse(stored).token;
    } catch { /* ignore */ }
    return null;
  })();

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Error ${res.status}` }));
    throw new Error(body.error || `Error ${res.status}`);
  }

  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.blob();
  }
  return res.json();
}
