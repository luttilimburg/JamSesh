import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ChatItem({ jam, onPress }) {
  const lastMsg = jam.last_message
  const timeStr = lastMsg ? formatTime(lastMsg.created_at) : formatTime(jam.date_time)
  const dateLabel = new Date(jam.date_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>♪</Text>
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemTop}>
          <Text style={styles.itemName} numberOfLines={1}>{jam.title}</Text>
          <Text style={styles.itemTime}>{timeStr}</Text>
        </View>
        <Text style={styles.itemSub}>{dateLabel} · {jam.location}</Text>
        {lastMsg ? (
          <Text style={styles.itemPreview} numberOfLines={1}>
            {lastMsg.sender}: {lastMsg.text}
          </Text>
        ) : (
          <Text style={styles.itemPreviewEmpty}>No messages yet</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth()
  const [jams, setJams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchJams = useCallback(async () => {
    try {
      const { data } = await client.get('/jams/mine/')
      const sorted = [...data].sort((a, b) => {
        const ta = a.last_message?.created_at || a.date_time
        const tb = b.last_message?.created_at || b.date_time
        return new Date(tb) - new Date(ta)
      })
      setJams(sorted)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { if (user) fetchJams() }, [fetchJams, user])

  if (!user) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateEmoji}>🎸</Text>
        <Text style={styles.gateTitle}>Login to see your messages</Text>
        <Text style={styles.gateSub}>Join jam sessions and chat with fellow musicians.</Text>
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
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={jams}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ChatItem jam={item} onPress={() => navigation.navigate('Chat', { jam: item })} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJams() }} tintColor="#aaa" />
        }
        ListEmptyComponent={!loading && (
          <Text style={styles.empty}>No chats yet.{'\n'}Join a jam session to start chatting!</Text>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
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
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#fff',
  },
  headerTitle: { color: '#222', fontSize: 28, fontWeight: '800' },
  item: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6FAF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22 },
  itemInfo: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemName: { color: '#222', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  itemTime: { color: '#888', fontSize: 13 },
  itemSub: { color: '#888', fontSize: 12, marginBottom: 3 },
  itemPreview: { color: '#717171', fontSize: 14 },
  itemPreviewEmpty: { color: '#BBBBBB', fontSize: 14, fontStyle: 'italic' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 78 },
  empty: { color: '#888', textAlign: 'center', marginTop: 60, fontSize: 15, lineHeight: 24 },
})
