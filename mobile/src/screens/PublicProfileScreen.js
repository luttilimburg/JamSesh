import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native'
import client from '../api/client'

export default function PublicProfileScreen({ route }) {
  const { username } = route.params
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get(`/users/users/${username}/`)
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00C896" size="large" /></View>
  }

  if (!profile) {
    return <View style={styles.center}><Text style={styles.errorText}>Could not load profile.</Text></View>
  }

  const p = profile.profile ?? {}
  const ts = profile.trust_stats ?? {}

  function openLink(url) {
    Linking.openURL(url).catch(() => {})
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.avatarSection}>
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{profile.username?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.username}>{profile.username}</Text>
        {p.location ? <Text style={styles.location}>📍 {p.location}</Text> : null}
      </View>

      {ts.successful_jams > 0 && (
        <View style={styles.trustBanner}>
          <Text style={styles.trustStat}>✅ {ts.successful_jams} successful jams</Text>
          {ts.would_jam_again_pct !== null && (
            <Text style={styles.trustStat}>⭐ {ts.would_jam_again_pct}% would jam again</Text>
          )}
        </View>
      )}

      {p.instruments ? (
        <View style={styles.section}>
          <Text style={styles.label}>Instruments</Text>
          <Text style={styles.value}>{p.instruments}</Text>
        </View>
      ) : null}

      {p.genres ? (
        <View style={styles.section}>
          <Text style={styles.label}>Genres</Text>
          <Text style={styles.value}>{p.genres}</Text>
        </View>
      ) : null}

      {p.skill_level ? (
        <View style={styles.section}>
          <Text style={styles.label}>Skill Level</Text>
          <Text style={styles.value}>{p.skill_level.charAt(0).toUpperCase() + p.skill_level.slice(1)}</Text>
        </View>
      ) : null}

      {p.bio ? (
        <View style={styles.section}>
          <Text style={styles.label}>About</Text>
          <Text style={styles.bio}>{p.bio}</Text>
        </View>
      ) : null}

      {(p.instagram_handle || p.tiktok_handle) ? (
        <View style={styles.section}>
          <Text style={styles.label}>Social</Text>
          {p.instagram_handle ? (
            <TouchableOpacity onPress={() => openLink(`https://www.instagram.com/${p.instagram_handle.replace(/^@/, '')}`)}>
              <Text style={styles.socialLink}>📸 @{p.instagram_handle.replace(/^@/, '')} →</Text>
            </TouchableOpacity>
          ) : null}
          {p.tiktok_handle ? (
            <TouchableOpacity onPress={() => openLink(`https://www.tiktok.com/@${p.tiktok_handle.replace(/^@/, '')}`)}>
              <Text style={styles.socialLink}>♪ @{p.tiktok_handle.replace(/^@/, '')} →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#888', fontSize: 15 },
  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 16 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#00C896', marginBottom: 12 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#E6FAF5', borderWidth: 2, borderColor: '#00C896',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarInitial: { color: '#009E78', fontSize: 36, fontWeight: '800' },
  username: { fontSize: 22, fontWeight: '800', color: '#222' },
  location: { color: '#888', fontSize: 13, marginTop: 4 },
  trustBanner: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 10, flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EBEBEB', marginBottom: 8 },
  trustStat: { color: '#009E78', fontWeight: '600', fontSize: 13 },
  section: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { fontSize: 12, fontWeight: '700', color: '#BBBBBB', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 16, color: '#222', fontWeight: '500' },
  bio: { fontSize: 15, color: '#444', lineHeight: 22 },
  socialLink: { color: '#009E78', fontSize: 15, fontWeight: '600', marginTop: 4 },
})
