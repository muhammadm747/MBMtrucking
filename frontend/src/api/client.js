/*
 * Thin fetch wrapper for the Django API. Same-origin session auth: the browser sends the
 * session cookie, and every write carries Django's CSRF token from the `csrftoken` cookie.
 */
export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.detail) || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

function cookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

let onUnauthorized = null;
/** Called when the server says the session is gone (403/401 on an authenticated call). */
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRFToken'] = cookie('csrftoken');
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch (e) {
    throw new ApiError(0, { detail: 'network' });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new ApiError(res.status, data);
    if ((res.status === 401 || res.status === 403) && !path.startsWith('/auth/') && onUnauthorized) onUnauthorized(err);
    throw err;
  }
  return data;
}

export const endpoints = {
  me: () => api('/auth/me/'),
  login: (username, password) => api('/auth/login/', { method: 'POST', body: { username, password } }),
  logout: () => api('/auth/logout/', { method: 'POST' }),

  trucks: () => api('/trucks/'),
  createTruck: (data) => api('/trucks/', { method: 'POST', body: data }),
  updateTruck: (id, data) => api(`/trucks/${id}/`, { method: 'PATCH', body: data }),

  loads: () => api('/loads/'),
  createLoad: (data) => api('/loads/', { method: 'POST', body: data }),
  updateLoad: (id, data) => api(`/loads/${encodeURIComponent(id)}/`, { method: 'PATCH', body: data }),
  deleteLoad: (id) => api(`/loads/${encodeURIComponent(id)}/`, { method: 'DELETE' }),

  expenses: () => api('/expenses/'),
  createExpense: (data) => api('/expenses/', { method: 'POST', body: data }),
  updateExpense: (id, data) => api(`/expenses/${encodeURIComponent(id)}/`, { method: 'PATCH', body: data }),
  deleteExpense: (id) => api(`/expenses/${encodeURIComponent(id)}/`, { method: 'DELETE' }),

  importBackup: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api('/backup/import/', { method: 'POST', form });
  },
  exportUrl: '/api/backup/export/',
};
