import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

function Section({ title, children, danger }) {
  return (
    <View style={[styles.section, danger && styles.sectionDanger]}>
      <Text style={[styles.sectionTitle, danger && styles.sectionTitleDanger]}>{title}</Text>
      {children}
    </View>
  )
}

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuth()

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwNew2, setPwNew2] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  const [emPassword, setEmPassword] = useState('')
  const [emNew, setEmNew] = useState('')
  const [emLoading, setEmLoading] = useState(false)
  const [emMsg, setEmMsg] = useState(null)

  const [delPassword, setDelPassword] = useState('')
  const [delLoading, setDelLoading] = useState(false)

  async function handleChangePassword() {
    setPwMsg(null)
    if (!pwCurrent || !pwNew || !pwNew2) {
      setPwMsg({ error: true, text: 'All fields are required.' })
      return
    }
    if (pwNew.length < 8) {
      setPwMsg({ error: true, text: 'New password must be at least 8 characters.' })
      return
    }
    if (pwNew !== pwNew2) {
      setPwMsg({ error: true, text: 'New passwords do not match.' })
      return
    }
    setPwLoading(true)
    try {
      await client.post('/users/change-password/', { current_password: pwCurrent, new_password: pwNew })
      setPwMsg({ error: false, text: 'Password updated!' })
      setPwCurrent(''); setPwNew(''); setPwNew2('')
    } catch (err) {
      setPwMsg({ error: true, text: err.response?.data?.detail || 'Could not update password.' })
    } finally {
      setPwLoading(false)
    }
  }

  async function handleChangeEmail() {
    setEmMsg(null)
    if (!emPassword || !emNew.trim()) {
      setEmMsg({ error: true, text: 'All fields are required.' })
      return
    }
    setEmLoading(true)
    try {
      await client.post('/users/change-email/', { password: emPassword, new_email: emNew.trim() })
      setEmMsg({ error: false, text: 'Email updated!' })
      setEmPassword(''); setEmNew('')
    } catch (err) {
      setEmMsg({ error: true, text: err.response?.data?.detail || 'Could not update email.' })
    } finally {
      setEmLoading(false)
    }
  }

  function confirmDelete() {
    if (!delPassword) {
      Alert.alert('Password required', 'Enter your password to delete your account.')
      return
    }
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, jams, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    )
  }

  async function handleDelete() {
    setDelLoading(true)
    try {
      await client.post('/users/delete-account/', { password: delPassword })
      await logout()
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not delete account.')
    } finally {
      setDelLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">

        <Section title="Change password">
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor="#BBBBBB"
            secureTextEntry
            value={pwCurrent}
            onChangeText={setPwCurrent}
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#BBBBBB"
            secureTextEntry
            value={pwNew}
            onChangeText={setPwNew}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#BBBBBB"
            secureTextEntry
            value={pwNew2}
            onChangeText={setPwNew2}
          />
          {pwMsg ? <Text style={pwMsg.error ? styles.error : styles.success}>{pwMsg.text}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={handleChangePassword} disabled={pwLoading}>
            <Text style={styles.btnText}>{pwLoading ? 'Saving...' : 'Update password'}</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Change email">
          <TextInput
            style={styles.input}
            placeholder="Your current password"
            placeholderTextColor="#BBBBBB"
            secureTextEntry
            value={emPassword}
            onChangeText={setEmPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="New email address"
            placeholderTextColor="#BBBBBB"
            autoCapitalize="none"
            keyboardType="email-address"
            value={emNew}
            onChangeText={setEmNew}
          />
          {emMsg ? <Text style={emMsg.error ? styles.error : styles.success}>{emMsg.text}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={handleChangeEmail} disabled={emLoading}>
            <Text style={styles.btnText}>{emLoading ? 'Saving...' : 'Update email'}</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Danger zone" danger>
          <Text style={styles.dangerDesc}>
            Deleting your account is permanent and cannot be undone. All your jam sessions, messages, and reviews will be removed.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password to confirm"
            placeholderTextColor="#BBBBBB"
            secureTextEntry
            value={delPassword}
            onChangeText={setDelPassword}
          />
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} disabled={delLoading}>
            <Text style={styles.deleteBtnText}>{delLoading ? 'Deleting...' : 'Delete my account'}</Text>
          </TouchableOpacity>
        </Section>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  section: {
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionDanger: { borderColor: '#fca5a5' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 14 },
  sectionTitleDanger: { color: '#ef4444' },
  input: {
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#222',
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#00C896',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 8 },
  success: { color: '#00C896', fontSize: 13, marginBottom: 8 },
  dangerDesc: { color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  deleteBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
