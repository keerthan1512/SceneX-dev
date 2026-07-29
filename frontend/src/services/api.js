import axios from 'axios'

const api = axios.create({
  baseURL: '/',
  timeout: 60000,
})

// ── Request interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor — silent token refresh on 401 ───────────────────────
let _refreshPromise = null  // deduplicate concurrent refresh calls

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Only attempt refresh once per request, and never on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          // Deduplicate: if a refresh is already in flight, wait for it
          if (!_refreshPromise) {
            _refreshPromise = axios
              .post('/auth/refresh', { refresh_token: refreshToken })
              .finally(() => { _refreshPromise = null })
          }
          const res = await _refreshPromise
          const newToken = res.data.access_token
          const newRefresh = res.data.refresh_token
          localStorage.setItem('access_token', newToken)
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          // Refresh itself failed — full logout
          _clearSession()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } else {
        _clearSession()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export function _clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) =>
    axios.post('/auth/refresh', { refresh_token: refreshToken }),
}

// ── Classify ──────────────────────────────────────────────────────────────────
export const classifyAPI = {
  classify: (formData) => api.post('/classify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
}

// ── Cases ─────────────────────────────────────────────────────────────────────
export const casesAPI = {
  upload: (formData) =>
    api.post('/cases/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  list: (params) => api.get('/cases', { params }),
  get: (caseId) => api.get(`/cases/${caseId}`),
  updateStatus: (caseId, status) =>
    api.patch(`/cases/${caseId}/status`, { status }),
  addNote: (caseId, text) => api.post(`/cases/${caseId}/notes`, { text }),
  downloadReport: (caseId) =>
    api.get(`/cases/${caseId}/report`, { responseType: 'blob' }),
  delete: (caseId) => api.delete(`/cases/${caseId}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  listInvestigators: () => api.get('/admin/investigators'),
  addInvestigator: (data) => api.post('/admin/investigators', data),
  updateInvestigator: (id, data) => api.patch(`/admin/investigators/${id}`, data),
}
