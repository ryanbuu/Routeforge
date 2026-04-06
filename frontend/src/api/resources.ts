import { apiClient } from './client'

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }).then(r => r.data),
  logout: () => apiClient.post('/auth/logout').then(r => r.data),
  me: () => apiClient.get('/auth/me').then(r => r.data),
}

export interface ApisixInstance {
  id: number
  name: string
  adminUrl: string
  apiKey: string
  default: boolean
  createdAt?: string
}

export const instancesApi = {
  list: () => apiClient.get('/instances').then(r => r.data) as Promise<ApisixInstance[]>,
  get: (id: number) => apiClient.get(`/instances/${id}`).then(r => r.data) as Promise<ApisixInstance>,
  create: (body: Partial<ApisixInstance>) => apiClient.post('/instances', body).then(r => r.data),
  update: (id: number, body: Partial<ApisixInstance>) => apiClient.put(`/instances/${id}`, body).then(r => r.data),
  remove: (id: number) => apiClient.delete(`/instances/${id}`),
  setDefault: (id: number) => apiClient.put(`/instances/${id}/default`),
}

export const routesApi = {
  list: (page?: number, size = 10) =>
    apiClient.get('/routes', { params: page != null ? { page, size } : undefined }).then(r => r.data),
  get: (id: string) => apiClient.get(`/routes/${id}`).then(r => r.data),
  create: (body: object) => apiClient.post('/routes', body).then(r => r.data),
  update: (id: string, body: object) => apiClient.put(`/routes/${id}`, body).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/routes/${id}`),
}

export const upstreamsApi = {
  list: () => apiClient.get('/upstreams').then(r => r.data),
  get: (id: string) => apiClient.get(`/upstreams/${id}`).then(r => r.data),
  create: (body: object) => apiClient.post('/upstreams', body).then(r => r.data),
  update: (id: string, body: object) => apiClient.put(`/upstreams/${id}`, body).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/upstreams/${id}`),
}

export const servicesApi = {
  list: (page?: number, size = 10) =>
    apiClient.get('/services', { params: page != null ? { page, size } : undefined }).then(r => r.data),
  get: (id: string) => apiClient.get(`/services/${id}`).then(r => r.data),
  create: (body: object) => apiClient.post('/services', body).then(r => r.data),
  update: (id: string, body: object) => apiClient.put(`/services/${id}`, body).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/services/${id}`),
}

export const consumersApi = {
  list: () => apiClient.get('/consumers').then(r => r.data),
  get: (username: string) => apiClient.get(`/consumers/${username}`).then(r => r.data),
  upsert: (username: string, body: object) => apiClient.put(`/consumers/${username}`, body).then(r => r.data),
  remove: (username: string) => apiClient.delete(`/consumers/${username}`),
}

export const pluginsApi = {
  list: () => apiClient.get('/plugins').then(r => r.data),
  listGlobalRules: () => apiClient.get('/plugins/global-rules').then(r => r.data),
  putGlobalRule: (id: string, body: object) => apiClient.put(`/plugins/global-rules/${id}`, body).then(r => r.data),
  deleteGlobalRule: (id: string) => apiClient.delete(`/plugins/global-rules/${id}`),
}

export const sslApi = {
  list: () => apiClient.get('/ssl').then(r => r.data),
  get: (id: string) => apiClient.get(`/ssl/${id}`).then(r => r.data),
  create: (body: object) => apiClient.post('/ssl', body).then(r => r.data),
  update: (id: string, body: object) => apiClient.put(`/ssl/${id}`, body).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/ssl/${id}`),
}

export const certApi = {
  parse: (cert: string) => apiClient.post('/cert/parse', { cert }).then(r => r.data),
  parseBatch: (certs: Record<string, string>) => apiClient.post('/cert/parse-batch', certs).then(r => r.data),
}

export const auditApi = {
  list: (page = 0, size = 20, resource?: string) =>
    apiClient.get('/audit-logs', { params: { page, size, resource } }).then(r => r.data),
}

export const healthApi = {
  check: () => apiClient.get('/health').then(r => r.data),
}
