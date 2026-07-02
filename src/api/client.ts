import axios from 'axios'
import { useAuthStore } from '../store/auth'

export const BASE_URL = 'http://192.168.0.107:9091'

const client = axios.create({ baseURL: BASE_URL, timeout: 15000 })

client.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

export default client
