import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (val) => setForm({ ...form, [key]: val })

  const handleRegister = async () => {
    setError('')
    if (form.password !== form.password2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password, form.password2)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        setError(Object.values(data).flat().join(' '))
      } else {
        setError('Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Join MusiMeet</Text>

        <TextInput style={styles.input} placeholder="Username" autoCapitalize="none" value={form.username} onChangeText={set('username')} />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set('email')} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={form.password} onChangeText={set('password')} />
        <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={form.password2} onChangeText={set('password2')} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Register'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#00C896', marginBottom: 28 },
  input: { borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12, color: '#222', backgroundColor: '#fff' },
  btn: { backgroundColor: '#00C896', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#ef4444', marginBottom: 8, fontSize: 14 },
  link: { textAlign: 'center', marginTop: 20, color: '#888', fontSize: 14 },
  linkBold: { color: '#009E78', fontWeight: '700' },
})
