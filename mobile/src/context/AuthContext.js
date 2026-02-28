import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    SecureStore.getItemAsync('access').then((token) => {
      if (token) {
        client.get('/users/me/')
          .then(({ data }) => setUser(data))
          .catch(async () => {
            await SecureStore.deleteItemAsync('access')
            await SecureStore.deleteItemAsync('refresh')
          })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [])

  const login = async (username, password) => {
    const { data } = await client.post('/users/login/', { username, password })
    await SecureStore.setItemAsync('access', data.access)
    await SecureStore.setItemAsync('refresh', data.refresh)
    const me = await client.get('/users/me/')
    setUser(me.data)
  }

  const register = async (username, email, password, password2) => {
    await client.post('/users/register/', { username, email, password, password2 })
    await login(username, password)
  }

  const socialLogin = async (provider, payload) => {
    const body = typeof payload === 'string' ? { access_token: payload } : payload
    const { data } = await client.post(`/users/${provider}/`, body)
    await SecureStore.setItemAsync('access', data.access)
    await SecureStore.setItemAsync('refresh', data.refresh)
    const me = await client.get('/users/me/')
    setUser(me.data)
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync('access')
    await SecureStore.deleteItemAsync('refresh')
    setUser(null)
  }

  const refreshUser = async () => {
    const { data } = await client.get('/users/me/')
    setUser(data)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, socialLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
