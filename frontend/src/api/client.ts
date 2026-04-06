import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败'
    return Promise.reject(new Error(msg))
  }
)

// Helper to parse APISIX list response: { list: [...], total: N }
export function parseApisixList(data: any): any[] {
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data)) return data
  return []
}
