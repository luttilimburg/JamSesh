import { useEffect, useState, useCallback } from 'react'
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

function groupByDate(jams) {
  const sorted = [...jams].sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
  const groups = {}
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  sorted.forEach((jam) => {
    const d = new Date(jam.date_time)
    let label
    if (d.toDateString() === today.toDateString()) {
      label = `Today, ${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`
    } else if (d.toDateString() === tomorrow.toDateString()) {
      label = `Tomorrow, ${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`
    } else {
      label = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(jam)
  })

  return Object.entries(groups).map(([title, data]) => ({ title, data }))
}

function JamRow({ jam, currentUser, navigation }) {
  const time = new Date(jam.date_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  const spotsLeft = jam.max_participants - jam.participant_count
  const isFull = spotsLeft <= 0
  const isOwner = currentUser?.username === jam.created_by

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('JamDetail', { jam })}
      activeOpacity={0.7}
    >
      <Text style={styles.time}>{time}</Text>
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowTitle}>{jam.title}</Text>
          <Text style={styles.rowMeta}>
            {jam.genre.charAt(0).toUpperCase() + jam.genre.slice(1)} · {jam.skill_level} · {jam.location}
          </Text>
          {isOwner && <Text style={styles.ownerTag}>Your session</Text>}
        </View>
        <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeOpen]}>
          <Text style={[styles.badgeText, isFull ? styles.badgeTextFull : styles.badgeTextOpen]}>
            {isFull ? 'Full' : `${spotsLeft} spots`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth()
  const [jams, setJams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchJams = useCallback(async () => {
    try {
      const { data } = await client.get('/jams/')
      setJams(data)
    } catch {
      Alert.alert('Error', 'Could not load jam sessions.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchJams() }, [fetchJams])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSub}>Jam Sessions</Text>
          <Text style={styles.headerDesc}>Open sessions you can join</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => user ? navigation.navigate('CreateJam') : navigation.navigate('Login')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupByDate(jams)}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <JamRow jam={item} currentUser={user} navigation={navigation} />}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.dateHeader}>{title}</Text>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJams() }} tintColor="#aaa" />
        }
        ListEmptyComponent={!loading && <Text style={styles.empty}>No jam sessions yet. Be the first!</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerTitle: { color: '#222', fontSize: 28, fontWeight: '800' },
  headerSub: { color: '#444', fontSize: 15, fontWeight: '600', marginTop: 2 },
  headerDesc: { color: '#888', fontSize: 13, marginTop: 2 },
  newBtn: { backgroundColor: '#00C896', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 6 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dateHeader: {
    color: '#717171',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#F7F7F7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  time: { color: '#888', fontSize: 15, fontWeight: '500', width: 52, paddingTop: 2 },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: '#00C896',
    paddingLeft: 12,
  },
  rowLeft: { flex: 1 },
  rowTitle: { color: '#222', fontSize: 16, fontWeight: '700' },
  rowMeta: { color: '#888', fontSize: 13, marginTop: 3 },
  ownerTag: { color: '#009E78', fontSize: 12, marginTop: 3, fontWeight: '600' },
  badge: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10 },
  badgeFull: { borderColor: '#ef4444' },
  badgeOpen: { borderColor: '#22c55e' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextFull: { color: '#ef4444' },
  badgeTextOpen: { color: '#22c55e' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 82 },
  empty: { color: '#888', textAlign: 'center', marginTop: 60, fontSize: 15 },
})
