import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, RefreshControl, ScrollView } from 'react-native'
import client from '../api/client'

const SKILLS = ['beginner', 'intermediate', 'advanced']

function MusicianCard({ item, navigation }) {
  const p = item.profile ?? {}
  const ts = item.trust_stats ?? {}

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{item.username?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.username}>{item.username}</Text>
        {p.instruments ? <Text style={styles.instruments} numberOfLines={1}>{p.instruments}</Text> : null}
        <View style={styles.cardMeta}>
          {p.skill_level ? (
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>{p.skill_level}</Text>
            </View>
          ) : null}
          {ts.successful_jams > 0 ? (
            <Text style={styles.trustText}>✅ {ts.successful_jams} jams</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function MusiciansScreen({ navigation }) {
  const [musicians, setMusicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState('')

  const fetchMusicians = useCallback(async (q, skill) => {
    try {
      const params = {}
      if (q) params.q = q
      if (skill) params.skill_level = skill
      const { data } = await client.get('/users/musicians/', { params })
      setMusicians(data)
    } catch {
      // silent fail — list just stays empty
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMusicians(search, filterSkill)
  }, [search, filterSkill, fetchMusicians])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Musicians</Text>
        <Text style={styles.headerSub}>Find people to jam with</Text>
      </View>

      <View style={styles.filterWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#BBBBBB"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SKILLS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, filterSkill === s && styles.chipActive]}
              onPress={() => setFilterSkill(filterSkill === s ? '' : s)}
            >
              <Text style={[styles.chipText, filterSkill === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={musicians}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MusicianCard item={item} navigation={navigation} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMusicians(search, filterSkill) }}
            tintColor="#aaa"
          />
        }
        ListEmptyComponent={!loading && (
          <Text style={styles.empty}>No musicians found.</Text>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#222' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  filterWrap: { paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  searchInput: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#222',
    marginBottom: 8,
  },
  chips: { paddingHorizontal: 16, gap: 6, flexDirection: 'row' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#EBEBEB' },
  chipActive: { backgroundColor: '#00C896' },
  chipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardLeft: { marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#EBEBEB' },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E6FAF5', borderWidth: 1.5, borderColor: '#C8F0E6',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#009E78', fontSize: 22, fontWeight: '800' },
  cardBody: { flex: 1 },
  username: { fontSize: 16, fontWeight: '700', color: '#222' },
  instruments: { fontSize: 13, color: '#888', marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  skillBadge: { backgroundColor: '#F0FBF7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#C8F0E6' },
  skillText: { color: '#009E78', fontSize: 12, fontWeight: '600' },
  trustText: { color: '#888', fontSize: 12 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 82 },
  empty: { color: '#888', textAlign: 'center', marginTop: 60, fontSize: 15 },
})
