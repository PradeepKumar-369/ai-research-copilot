// Local replacement for the @base44/sdk client. Talks to the Express backend
// in server/ instead of Base44's hosted platform — same call shapes the rest
// of the app already expects (axios-like .data / .response.data.error),
// so no other file needs to change.
const API_BASE = '/api';
const TOKEN_KEY = 'base44_access_token';

function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable — auth simply won't persist across reloads.
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // No JSON body (e.g. 204) — leave json as null.
  }
  if (!res.ok) {
    const err = new Error((json && (json.error || json.message)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = json;
    err.response = { status: res.status, data: json };
    throw err;
  }
  return json;
}

function makeEntity(name) {
  return {
    list: (sort) => request(`/entities/${name}${sort ? `?sort=${encodeURIComponent(sort)}` : ''}`),
    filter: (query = {}, sort, limit) => request(`/entities/${name}/filter`, { method: 'POST', body: { query, sort, limit } }),
    get: (id) => request(`/entities/${name}/${id}`),
    create: (data) => request(`/entities/${name}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/entities/${name}/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/entities/${name}/${id}`, { method: 'DELETE' }),
    bulkCreate: (records) => request(`/entities/${name}/bulk`, { method: 'POST', body: { records } }),
    deleteMany: (query) => request(`/entities/${name}/delete-many`, { method: 'POST', body: { query } }),
  };
}

export const base44 = {
  app: {
    getPublicSettings: () => request('/app/public-settings', { auth: false }),
  },
  auth: {
    me: () => request('/auth/me'),
    loginViaEmailPassword: async (email, password) => {
      const res = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      if (res?.access_token) setToken(res.access_token);
      return res;
    },
    register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
    verifyOtp: async ({ email, otpCode }) => {
      const res = await request('/auth/verify-otp', { method: 'POST', body: { email, otpCode }, auth: false });
      if (res?.access_token) setToken(res.access_token);
      return res;
    },
    resendOtp: (email) => request('/auth/resend-otp', { method: 'POST', body: { email }, auth: false }),
    resetPasswordRequest: (email) => request('/auth/reset-password-request', { method: 'POST', body: { email }, auth: false }),
    resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data, auth: false }),
    setToken,
    logout: (redirectUrl) => {
      setToken(null);
      if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin: (returnTo) => {
      window.location.href = '/login' + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '');
    },
    loginWithProvider: () => {
      window.alert('Social login needs a hosted OAuth provider and is not available in local development mode. Please use email/password.');
    },
  },
  entities: {
    Project: makeEntity('project'),
    Paper: makeEntity('paper'),
    Chunk: makeEntity('chunk'),
    ChatMessage: makeEntity('chatmessage'),
    GapCandidate: makeEntity('gapcandidate'),
    User: makeEntity('user'),
  },
  functions: {
    invoke: (name, payload) => request(`/functions/${name}`, { method: 'POST', body: payload }).then(data => ({ data })),
  },
  integrations: {
    Core: {
      UploadPublicFile: async ({ file }) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const err = new Error((json && json.error) || 'Upload failed');
          err.response = { status: res.status, data: json };
          throw err;
        }
        return json;
      },
    },
  },
};
