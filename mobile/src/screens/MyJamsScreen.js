import { useEffect, useState, useCallback } from 'react'
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

function JamRow({ jam, onDelete, navigation }) {
  const d = new Date(jam.date_time)
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const spotsLeft = jam.max_participants - jam.participant_count
  const isFull = spotsLeft <= 0

  return (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('JamDetail', { jam })} activeOpacity={0.7}>
      <View style={styles.timeCol}>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowTitle}>{jam.title}</Text>
          <Text style={styles.rowMeta}>
            {jam.genre.charAt(0).toUpperCase() + jam.genre.slice(1)} · {jam.skill_level} · {jam.location}
          </Text>
        </View>
        <View style={styles.rightCol}>
          <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeOpen]}>
            <Text style={[styles.badgeText, isFull ? styles.badgeTextFull : styles.badgeTextOpen]}>
              {isFull ? 'Full' : `${spotsLeft} spots`}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(jam.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function MyJamsScreen({ navigation }) {
  const { user } = useAuth()
  const [myJams, setMyJams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchMyJams = useCallback(async () => {
    try {
      const { data } = await client.get('/jams/mine/')
      setMyJams(data)
    } catch {
      Alert.alert('Error', 'Could not load your jams.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { if (user) fetchMyJams() }, [fetchMyJams, user])

  const handleDelete = (id) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this jam session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/jams/${id}/`)
            fetchMyJams()
          } catch {
            Alert.alert('Error', 'Could not delete session.')
          }
        },
      },
    ])
  }

  const created = myJams.filter((j) => j.created_by === user?.username)
  const joined = myJams.filter((j) => j.created_by !== user?.username)
  const sections = []
  if (created.length) sections.push({ title: 'Created by me', data: created, showDelete: true })
  if (joined.length) sections.push({ title: 'Joined', data: joined, showDelete: false })

  if (!user) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateEmoji}>🎵</Text>
        <Text style={styles.gateTitle}>Login to see your jams</Text>
        <Text style={styles.gateSub}>Create sessions or join ones you love, all in one place.</Text>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Jams</Text>
        <Text style={styles.headerDesc}>Sessions you created or joined</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, section }) => (
          <JamRow jam={item} onDelete={section.showDelete ? handleDelete : null} navigation={navigation} />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyJams() }} tintColor="#aaa" />
        }
        ListEmptyComponent={!loading && <Text style={styles.empty}>No sessions yet.{'\n'}Explore and join one!</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerTitle: { color: '#222', fontSize: 28, fontWeight: '800' },
  headerDesc: { color: '#888', fontSize: 13, marginTop: 4 },
  sectionHeader: {
    color: '#717171',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#F7F7F7',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  timeCol: { width: 52, alignItems: 'center', paddingTop: 2 },
  dateText: { color: '#888', fontSize: 11, fontWeight: '600' },
  time: { color: '#717171', fontSize: 14, fontWeight: '500', marginTop: 2 },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 2,
    borderLeftColor: '#00C896',
    paddingLeft: 12,
  },
  rowLeft: { flex: 1 },
  rowTitle: { color: '#222', fontSize: 16, fontWeight: '700' },
  rowMeta: { color: '#888', fontSize: 13, marginTop: 3 },
  rightCol: { alignItems: 'flex-end', marginLeft: 10 },
  badge: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeFull: { borderColor: '#ef4444' },
  badgeOpen: { borderColor: '#22c55e' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextFull: { color: '#ef4444' },
  badgeTextOpen: { color: '#22c55e' },
  deleteBtn: { marginTop: 8 },
  deleteText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 82 },
  empty: { color: '#888', textAlign: 'center', marginTop: 60, fontSize: 15, lineHeight: 24 },
})
