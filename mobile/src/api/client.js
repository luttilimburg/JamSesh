import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// Use your computer's local IP when testing on a physical device
// Use 10.0.2.2 for Android emulator, localhost for iOS simulator
export const API_URL = 'http://192.168.178.22:8000/api'

const client = axios.create({ baseURL: API_URL })

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = await SecureStore.getItemAsync('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/users/token/refresh/`, { refresh })
          await SecureStore.setItemAsync('access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return client(original)
        } catch {
          await SecureStore.deleteItemAsync('access')
          await SecureStore.deleteItemAsync('refresh')
        }
      }
    }
    return Promise.reject(error)
  }
)

export default client
