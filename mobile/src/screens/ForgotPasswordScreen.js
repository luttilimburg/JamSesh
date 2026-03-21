import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native'
import client from '../api/client'

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(1)          // 1 = enter email, 2 = enter code + new password
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef(null)

  async function handleSend() {
    setError('')
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      await client.post('/users/password/forgot/', { email: email.trim().toLowerCase() })
      setStep(2)
      setTimeout(() => codeRef.current?.focus(), 300)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send reset code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    setError('')
    if (!code.trim()) {
      setError('Please enter the code from your email.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== newPassword2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await client.post('/users/password/reset/', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
      })
      Alert.alert(
        'Password reset!',
        'Your password has been updated. You can now log in.',
        [{ text: 'Log in', onPress: () => navigation.navigate('Login') }]
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code.')
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
        <Text style={styles.title}>Forgot password</Text>

        {step === 1 ? (
          <>
            <Text style={styles.subtitle}>
              Enter your account email and we'll send you a 6-digit reset code.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#BBBBBB"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={handleSend} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send reset code'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              A code was sent to {email}. Enter it below along with your new password.
            </Text>
            <TextInput
              ref={codeRef}
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor="#BBBBBB"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#BBBBBB"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#BBBBBB"
              secureTextEntry
              value={newPassword2}
              onChangeText={setNewPassword2}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Resetting...' : 'Reset password'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep(1); setError('') }}>
              <Text style={styles.back}>← Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back to login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#00C896', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24, lineHeight: 22 },
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
  btn: {
    backgroundColor: '#00C896',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  back: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 },
})
