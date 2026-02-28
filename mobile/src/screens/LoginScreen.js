import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { useAuth } from '../context/AuthContext'

WebBrowser.maybeCompleteAuthSession()

const GOOGLE_WEB_CLIENT_ID = '710977512614-gfvk1oadl9baj27r2anatam9s2k7iki2.apps.googleusercontent.com'

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
}

export default function LoginScreen({ navigation }) {
  const { login, socialLogin } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true })

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
    },
    GOOGLE_DISCOVERY
  )

  useEffect(() => {
    if (response?.type === 'success') {
      const code = response.params?.code
      const accessToken = response.authentication?.accessToken
      if (code) {
        handleGoogleCode(code, request?.codeVerifier)
      } else if (accessToken) {
        handleGoogleToken(accessToken)
      }
    }
  }, [response])

  async function handleGoogleCode(code, codeVerifier) {
    setSocialLoading(true)
    setError('')
    try {
      await socialLogin('google-code', { code, codeVerifier, redirectUri })
      navigation.goBack()
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleGoogleToken(accessToken) {
    setSocialLoading(true)
    setError('')
    try {
      await socialLogin('google', accessToken)
      navigation.goBack()
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigation.goBack()
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
        <Text style={styles.title}>MusiMeet</Text>
        <Text style={styles.subtitle}>Find your next jam session</Text>

        <TouchableOpacity
          style={[styles.googleBtn, (!request || socialLoading) && styles.btnDisabled]}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={!request || socialLoading}
        >
          <Text style={styles.googleBtnText}>
            {socialLoading ? 'Connecting...' : 'G  Continue with Google'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#BBBBBB"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#BBBBBB"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>
            {"Don't have an account? "}
            <Text style={styles.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#00C896', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 36 },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
  },
  btnDisabled: { opacity: 0.5 },
  googleBtnText: { color: '#222', fontWeight: '700', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EBEBEB' },
  dividerText: { color: '#888', marginHorizontal: 12, fontSize: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#222',
    marginBottom: 12,
  },
  error: { color: '#ef4444', marginBottom: 8, fontSize: 14 },
  loginBtn: {
    backgroundColor: '#00C896',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#888', fontSize: 14 },
  linkBold: { color: '#009E78', fontWeight: '700' },
})
