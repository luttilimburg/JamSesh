import { useState, useEffect } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

const SKILLS = ['', 'beginner', 'intermediate', 'advanced']

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth()
  const [form, setForm] = useState({ instruments: '', genres: '', skill_level: '', bio: '', location: '', instagram_handle: '', tiktok_handle: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

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
      })
    }
  }, [user])

  const set = (key) => (val) => setForm({ ...form, [key]: val })

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

      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
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
  logoutBtn: { marginTop: 12, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#EBEBEB' },
  logoutText: { color: '#888', fontWeight: '600' },

  sectionHeader: { color: '#009E78', fontWeight: '700', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: 28, marginBottom: 4 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialIcon: { color: '#009E78', fontSize: 16, fontWeight: '800', width: 24, textAlign: 'center' },
  socialInput: { flex: 1 },
  socialLink: { color: '#009E78', fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 4 },
})
