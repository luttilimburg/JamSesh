import { useState, useEffect, useRef } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

const SKILLS = ['', 'beginner', 'intermediate', 'advanced']

const COMPLETENESS_LABELS = {
  avatar: 'Add a profile photo',
  instruments: 'List your instruments',
  skill_level: 'Set your skill level',
  bio: 'Write a short bio',
  social_link: 'Add an Instagram or TikTok handle',
}

function CompletenessCard({ score, missing }) {
  return (
    <View style={cs.card}>
      <View style={cs.header}>
        <Text style={cs.title}>Profile Completeness</Text>
        <Text style={cs.pct}>{score}%</Text>
      </View>
      <View style={cs.track}>
        <View style={[cs.fill, { flex: score / 100 }]} />
        <View style={{ flex: Math.max(1 - score / 100, 0) }} />
      </View>
      {score < 100 && missing.length > 0 && (
        <View style={cs.hints}>
          {missing.map((key) => (
            <Text key={key} style={cs.hint}>• {COMPLETENESS_LABELS[key]}</Text>
          ))}
        </View>
      )}
      {score === 100 && (
        <Text style={cs.complete}>Profile complete!</Text>
      )}
    </View>
  )
}

const cs = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: '#F0FBF7',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C8F0E6',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#222', fontWeight: '700', fontSize: 14 },
  pct: { color: '#00C896', fontWeight: '800', fontSize: 16 },
  track: { height: 6, flexDirection: 'row', backgroundColor: '#DDDDDD', borderRadius: 3, marginBottom: 10 },
  fill: { backgroundColor: '#00C896', borderRadius: 3 },
  hints: { gap: 4 },
  hint: { color: '#717171', fontSize: 13 },
  complete: { color: '#009E78', fontSize: 13, fontWeight: '600' },
})

const ts = StyleSheet.create({
  banner: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 10, marginBottom: 4, flexWrap: 'wrap' },
  stat: { color: '#009E78', fontWeight: '600', fontSize: 13 },
})

const ph = StyleSheet.create({
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FBF7', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 6,
    borderWidth: 1, borderColor: '#C8F0E6',
  },
  verifiedText: { color: '#009E78', fontWeight: '700', fontSize: 13 },
  verifyBox: { marginTop: 8 },
  sendBtn: {
    backgroundColor: '#F0FBF7', borderWidth: 1.5, borderColor: '#00C896',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  sendBtnText: { color: '#009E78', fontWeight: '600', fontSize: 14 },
  otpHint: { color: '#717171', fontSize: 13, marginBottom: 8 },
  otpRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  otpInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#00C896', borderRadius: 8,
    padding: 12, fontSize: 20, color: '#222', letterSpacing: 6, textAlign: 'center',
  },
  verifyBtn: {
    backgroundColor: '#00C896', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 18,
  },
  verifyBtnDisabled: { backgroundColor: '#CCCCCC' },
  verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resendLink: { color: '#009E78', fontSize: 13, fontWeight: '600', marginTop: 8 },
})

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth()
  const [form, setForm] = useState({ instruments: '', genres: '', skill_level: '', bio: '', location: '', instagram_handle: '', tiktok_handle: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Phone verification
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const otpRef = useRef(null)

  useEffect(() => {
    if (user?.profile) {
      setForm({
        instruments: user.profile.instruments || '',
        genres: user.profile.genres || '',
        skill_level: user.profile.skill_level || '',
        bio: user.profile.bio || '',
        location: user.profile.location || '',
        instagram_handle: user.profile.instagram_handle || '',
        tiktok_handle: user.profile.tiktok_handle || '',
        phone: user.profile.phone || '',
      })
    }
  }, [user])

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }))

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to change your profile picture.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      setUploading(true)
      try {
        const filename = uri.split('/').pop()
        const ext = filename.split('.').pop().toLowerCase()
        const formData = new FormData()
        formData.append('avatar', { uri, name: filename, type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` })
        await client.patch('/users/me/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        await refreshUser()
      } catch {
        Alert.alert('Error', 'Failed to upload photo.')
      } finally {
        setUploading(false)
      }
    }
  }

  const handleSave = async () => {
    setLoading(true)
    // If user changed the phone, reset verification state locally too
    if (form.phone !== (user?.profile?.phone || '')) {
      setOtpSent(false)
      setOtpCode('')
    }
    try {
      await client.patch('/users/me/', form)
      await refreshUser()
      Alert.alert('Saved', 'Profile updated!')
    } catch {
      Alert.alert('Error', 'Failed to save profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    setSendingOtp(true)
    try {
      const { data } = await client.post('/phone/send-otp/')
      setOtpSent(true)
      setOtpCode('')
      setOtpEmail(data.email || user?.email || '')
      setTimeout(() => otpRef.current?.focus(), 300)
      Alert.alert('Code sent!', `A 6-digit code was sent to ${data.email || 'your email'}.`)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not send code.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      Alert.alert('Enter code', 'Please enter the 6-digit code from your email.')
      return
    }
    setVerifyingOtp(true)
    try {
      await client.post('/phone/verify/', { code: otpCode })
      await refreshUser()
      setOtpSent(false)
      setOtpCode('')
      Alert.alert('Verified!', 'Your phone number has been verified.')
    } catch (err) {
      Alert.alert('Invalid code', err.response?.data?.detail || 'Could not verify code.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  if (!user) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateEmoji}>👤</Text>
        <Text style={styles.gateTitle}>Your Profile</Text>
        <Text style={styles.gateSub}>Login to manage your profile and connect with musicians.</Text>
        <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.gateBtnText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.gateLink}>Create an account</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploading}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user.username?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.avatarBadgeText}>✏️</Text>
            }
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Trust stats */}
      {user.trust_stats?.successful_jams > 0 && (
        <View style={ts.banner}>
          <Text style={ts.stat}>✅ {user.trust_stats.successful_jams} successful jams</Text>
          {user.trust_stats.would_jam_again_pct !== null && (
            <Text style={ts.stat}>⭐ {user.trust_stats.would_jam_again_pct}% would jam again</Text>
          )}
        </View>
      )}

      {/* Completeness card */}
      <CompletenessCard
        score={user.profile?.completeness_score ?? 0}
        missing={user.profile?.missing_fields ?? []}
      />

      <Text style={styles.label}>Instruments (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={form.instruments}
        onChangeText={set('instruments')}
        placeholder="e.g. guitar, drums"
        placeholderTextColor="#BBBBBB"
      />

      <Text style={styles.label}>Genres (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={form.genres}
        onChangeText={set('genres')}
        placeholder="e.g. jazz, blues"
        placeholderTextColor="#BBBBBB"
      />

      <Text style={styles.label}>Skill Level</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={form.skill_level} onValueChange={set('skill_level')}>
          {SKILLS.map((s) => (
            <Picker.Item key={s} label={s ? s.charAt(0).toUpperCase() + s.slice(1) : '-- Select --'} value={s} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        value={form.location}
        onChangeText={set('location')}
        placeholder="City, Country"
        placeholderTextColor="#BBBBBB"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={form.bio}
        onChangeText={set('bio')}
        placeholder="Tell other musicians about yourself..."
        placeholderTextColor="#BBBBBB"
        multiline
        numberOfLines={4}
      />

      <Text style={styles.sectionHeader}>Social Links</Text>

      <Text style={styles.label}>Instagram</Text>
      <View style={styles.socialRow}>
        <Text style={styles.socialIcon}>📸</Text>
        <TextInput
          style={[styles.input, styles.socialInput]}
          value={form.instagram_handle}
          onChangeText={set('instagram_handle')}
          placeholder="@yourhandle"
          placeholderTextColor="#BBBBBB"
          autoCapitalize="none"
        />
      </View>
      {!!form.instagram_handle && (
        <TouchableOpacity onPress={() => {
          const handle = form.instagram_handle.replace(/^@/, '')
          Linking.openURL(`https://www.instagram.com/${handle}`).catch(() => {})
        }}>
          <Text style={styles.socialLink}>Open Instagram profile →</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>TikTok</Text>
      <View style={styles.socialRow}>
        <Text style={styles.socialIcon}>♪</Text>
        <TextInput
          style={[styles.input, styles.socialInput]}
          value={form.tiktok_handle}
          onChangeText={set('tiktok_handle')}
          placeholder="@yourhandle"
          placeholderTextColor="#BBBBBB"
          autoCapitalize="none"
        />
      </View>
      {!!form.tiktok_handle && (
        <TouchableOpacity onPress={() => {
          const handle = form.tiktok_handle.replace(/^@/, '')
          Linking.openURL(`https://www.tiktok.com/@${handle}`).catch(() => {})
        }}>
          <Text style={styles.socialLink}>Open TikTok profile →</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionHeader}>Verification</Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={form.phone}
        onChangeText={(v) => { set('phone')(v); setOtpSent(false); setOtpCode('') }}
        placeholder="+1 555 123 4567"
        placeholderTextColor="#BBBBBB"
        keyboardType="phone-pad"
      />

      {!!form.phone && (
        user?.profile?.phone_verified && form.phone === (user?.profile?.phone || '') ? (
          <View style={ph.verifiedBadge}>
            <Text style={ph.verifiedText}>✓ Phone verified</Text>
          </View>
        ) : (
          <View style={ph.verifyBox}>
            {!otpSent ? (
              <TouchableOpacity
                style={ph.sendBtn}
                onPress={handleSendOtp}
                disabled={sendingOtp}
              >
                <Text style={ph.sendBtnText}>
                  {sendingOtp ? 'Sending...' : 'Send verification code'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={ph.otpHint}>Enter the 6-digit code sent to {otpEmail || user?.email}</Text>
                <View style={ph.otpRow}>
                  <TextInput
                    ref={otpRef}
                    style={ph.otpInput}
                    value={otpCode}
                    onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor="#BBBBBB"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[ph.verifyBtn, otpCode.length !== 6 && ph.verifyBtnDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp || otpCode.length !== 6}
                  >
                    <Text style={ph.verifyBtnText}>
                      {verifyingOtp ? '...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp}>
                  <Text style={ph.resendLink}>{sendingOtp ? 'Sending...' : 'Resend code'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )
      )}

      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsText}>Account Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32 },
  gateEmoji: { fontSize: 48, marginBottom: 16 },
  gateTitle: { color: '#222', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  gateSub: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  gateBtn: { backgroundColor: '#00C896', padding: 16, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 12 },
  gateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  gateLink: { color: '#009E78', fontSize: 15, fontWeight: '600' },

  container: { flex: 1, backgroundColor: '#fff', padding: 20 },

  avatarSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 8 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#00C896' },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#E6FAF5',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#00C896',
  },
  avatarInitial: { color: '#009E78', fontSize: 36, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#00C896',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarBadgeText: { fontSize: 12 },

  title: { fontSize: 22, fontWeight: '800', color: '#222' },
  email: { color: '#888', fontSize: 13, marginTop: 2, marginBottom: 16 },

  label: { fontSize: 14, fontWeight: '600', color: '#717171', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 8, padding: 11, fontSize: 15, color: '#222', backgroundColor: '#fff' },
  textarea: { height: 90, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 8, backgroundColor: '#fff' },
  btn: { backgroundColor: '#00C896', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  settingsBtn: { marginTop: 12, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#EBEBEB' },
  settingsText: { color: '#009E78', fontWeight: '600' },
  logoutBtn: { marginTop: 8, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#EBEBEB' },
  logoutText: { color: '#888', fontWeight: '600' },

  sectionHeader: { color: '#009E78', fontWeight: '700', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: 28, marginBottom: 4 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialIcon: { color: '#009E78', fontSize: 16, fontWeight: '800', width: 24, textAlign: 'center' },
  socialInput: { flex: 1 },
  socialLink: { color: '#009E78', fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 4 },
})
