import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Linking, Platform, Modal, TextInput,
} from 'react-native'
import * as StoreReview from 'expo-store-review'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

const GENRE_ICONS = {
  jazz: '🎷', rock: '🎸', pop: '🎤', hiphop: '🎧', classical: '🎻', other: '🎵',
}

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'no_show', label: 'Repeatedly no-show' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
]

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function ProgressBar({ filled, total }) {
  const pct = total > 0 ? Math.min(filled / total, 1) : 0
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { flex: pct }]} />
      <View style={{ flex: Math.max(1 - pct, 0) }} />
    </View>
  )
}
const pb = StyleSheet.create({
  track: { height: 4, flexDirection: 'row', backgroundColor: '#EBEBEB', borderRadius: 2, marginVertical: 10 },
  fill: { backgroundColor: '#00C896', borderRadius: 2 },
})

export default function JamDetailScreen({ route, navigation }) {
  const { jam: initialJam } = route.params
  const { user } = useAuth()
  const [jam, setJam] = useState(initialJam)
  const [createdBy, setCreatedBy] = useState(initialJam.created_by)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isPast, setIsPast] = useState(false)
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm] = useState({ showed_up: null, would_jam_again: null })
  const [reviewedIds, setReviewedIds] = useState(new Set())
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reportModal, setReportModal] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  const isOwner = user?.username === createdBy
  const isJoined = participants.some((p) => p.username === user?.username)
  // Organiser always occupies one spot
  const spotsLeft = jam.max_participants - participants.length - 1
  const isFull = spotsLeft <= 0

  const d = new Date(jam.date_time)
  const dateStr = d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const fetchParticipants = useCallback(async () => {
    try {
      const { data } = await client.get(`/jams/${jam.id}/participants/`)
      setCreatedBy(data.created_by)
      setParticipants(data.participants)
    } catch {}
    setLoading(false)
  }, [jam.id])

  useEffect(() => {
    navigation.setOptions({ title: jam.title })
    fetchParticipants()
    setIsPast(new Date(jam.date_time) < new Date())
  }, [])

  async function handleJoin() {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    setActionLoading(true)
    try {
      await client.post('/join/', { jam_session: jam.id })
      await fetchParticipants()
      maybeRequestReview()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not join session.')
    } finally {
      setActionLoading(false)
    }
  }

  async function maybeRequestReview() {
    try {
      const already = await AsyncStorage.getItem('review_requested')
      if (already) return
      const available = await StoreReview.isAvailableAsync()
      if (!available) return
      await AsyncStorage.setItem('review_requested', '1')
      await StoreReview.requestReview()
    } catch (_) {}
  }

  async function handleLeave() {
    Alert.alert('Leave Session', 'Are you sure you want to leave this jam?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await client.delete(`/jams/${jam.id}/leave/`)
            await fetchParticipants()
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail || 'Could not leave session.')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  async function handleDelete() {
    Alert.alert('Delete Session', 'This will permanently delete the jam session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/jams/${jam.id}/`)
            navigation.goBack()
          } catch {
            Alert.alert('Error', 'Could not delete session.')
          }
        },
      },
    ])
  }

  async function handleSubmitReview() {
    setSubmittingReview(true)
    try {
      await client.post(`/jams/${jam.id}/review/`, {
        reviewee: reviewModal.userId,
        showed_up: reviewForm.showed_up,
        would_jam_again: reviewForm.would_jam_again,
      })
      setReviewedIds((prev) => new Set([...prev, reviewModal.userId]))
      setReviewModal(null)
      setReviewForm({ showed_up: null, would_jam_again: null })
      Alert.alert('Done', 'Review submitted!')
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not submit review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  async function handleSubmitReport() {
    setSubmittingReport(true)
    try {
      await client.post('/report/', {
        reported_user: reportModal.userId,
        jam_session: jam.id,
        reason: reportReason,
        details: reportDetails,
      })
      setReportModal(null)
      setReportReason('')
      setReportDetails('')
      Alert.alert('Reported', 'Your report has been submitted. Our team will review it.')
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not submit report.')
    } finally {
      setSubmittingReport(false)
    }
  }

  const totalConfirmed = participants.length + 1 // +1 for organizer

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{GENRE_ICONS[jam.genre] || '🎵'}</Text>
          <Text style={styles.heroTitle}>{jam.title}</Text>
          <View style={styles.heroTags}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{capitalize(jam.genre)}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{capitalize(jam.skill_level)}</Text>
            </View>
            <View style={[styles.pill, isFull ? styles.pillFull : styles.pillSpots]}>
              <Text style={[styles.pillText, isFull ? styles.pillTextFull : styles.pillTextSpots]}>
                {isFull ? 'Full' : `${spotsLeft} spots left`}
              </Text>
            </View>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View>
              <Text style={styles.infoMain}>{dateStr}</Text>
              <Text style={styles.infoSub}>{timeStr}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => {
              const lat = jam.latitude
              const lng = jam.longitude
              let url
              if (lat != null && lng != null) {
                url = Platform.OS === 'ios'
                  ? `maps://${lat},${lng}?q=${lat},${lng}`
                  : `geo:${lat},${lng}?q=${lat},${lng}`
              } else {
                const q = encodeURIComponent(jam.location)
                url = Platform.OS === 'ios' ? `maps://0,0?q=${q}` : `geo:0,0?q=${q}`
              }
              Linking.openURL(url).catch(() => {
                const q = lat != null && lng != null
                  ? `${lat},${lng}`
                  : encodeURIComponent(jam.location)
                Linking.openURL(`https://maps.google.com/?q=${q}`)
              })
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.infoIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoMain} numberOfLines={2}>{jam.location}</Text>
              <Text style={styles.infoMapHint}>Tap to open in maps</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <Text style={styles.infoMain}>Organised by <Text style={styles.organiserName}>{createdBy}</Text></Text>
          </View>
        </View>

        {/* Description */}
        {jam.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descText} numberOfLines={expanded ? undefined : 3}>
              {jam.description}
            </Text>
            {jam.description.length > 120 && (
              <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{GENRE_ICONS[jam.genre]} {capitalize(jam.genre)}</Text>
          </View>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>🎓 {capitalize(jam.skill_level)}</Text>
          </View>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>👥 Max {jam.max_participants}</Text>
          </View>
        </View>

        {/* Players */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players</Text>
          <View style={styles.playersMeta}>
            <Text style={styles.confirmedText}>
              <Text style={styles.confirmedCount}>{totalConfirmed}</Text> confirmed
            </Text>
            <Text style={styles.spotsText}>
              {isFull ? 'Session full' : `${spotsLeft} spots left`}
            </Text>
          </View>
          <ProgressBar filled={totalConfirmed} total={jam.max_participants} />

          {loading ? (
            <ActivityIndicator color="#a78bfa" style={{ marginTop: 12 }} />
          ) : (
            <>
              {/* Organiser */}
              <View style={styles.playerRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{createdBy.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.playerName}>{createdBy}</Text>
                  <Text style={styles.playerRole}>Organiser</Text>
                </View>
              </View>
              {/* Participants */}
              {participants.map((p) => (
                <View key={String(p.id)} style={styles.playerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.username.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>{p.username}</Text>
                    {p.jammed_before && (
                      <View style={jb.badge}>
                        <Text style={jb.badgeText}>Jammed before</Text>
                      </View>
                    )}
                    {p.trust_stats?.successful_jams > 0 && (
                      <Text style={styles.trustLine}>
                        {p.trust_stats.successful_jams} successful jams
                        {p.trust_stats.would_jam_again_pct !== null
                          ? ` · ${p.trust_stats.would_jam_again_pct}% would jam again`
                          : ''}
                      </Text>
                    )}
                  </View>
                  {user && p.username !== user.username && (
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {isPast && (isOwner || isJoined) && !reviewedIds.has(p.id) && (
                        <TouchableOpacity
                          style={rv.reviewBtn}
                          onPress={() => setReviewModal({ userId: p.id, username: p.username })}
                        >
                          <Text style={rv.reviewBtnText}>Review</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={rp.reportLink}
                        onPress={() => setReportModal({ userId: p.id, username: p.username })}
                      >
                        <Text style={rp.reportLinkText}>Report</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Owner actions */}
        {isOwner && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate('Chat', { jam })}
            >
              <Text style={styles.chatBtnText}>💬  Open session chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete this session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Review modal */}
      <Modal visible={!!reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(null)}>
        <View style={rv.overlay}>
          <View style={rv.sheet}>
            <Text style={rv.sheetTitle}>Review {reviewModal?.username}</Text>

            <Text style={rv.question}>Did they show up?</Text>
            <View style={rv.btnRow}>
              <TouchableOpacity
                style={[rv.yesno, reviewForm.showed_up === true && rv.selected]}
                onPress={() => setReviewForm((f) => ({ ...f, showed_up: true }))}
              >
                <Text style={rv.yesnoText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[rv.yesno, reviewForm.showed_up === false && rv.selected]}
                onPress={() => setReviewForm((f) => ({ ...f, showed_up: false }))}
              >
                <Text style={rv.yesnoText}>No</Text>
              </TouchableOpacity>
            </View>

            <Text style={rv.question}>Would you jam again?</Text>
            <View style={rv.btnRow}>
              <TouchableOpacity
                style={[rv.yesno, reviewForm.would_jam_again === true && rv.selected]}
                onPress={() => setReviewForm((f) => ({ ...f, would_jam_again: true }))}
              >
                <Text style={rv.yesnoText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[rv.yesno, reviewForm.would_jam_again === false && rv.selected]}
                onPress={() => setReviewForm((f) => ({ ...f, would_jam_again: false }))}
              >
                <Text style={rv.yesnoText}>No</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[rv.submitBtn, (reviewForm.showed_up === null || reviewForm.would_jam_again === null) && rv.disabled]}
              disabled={reviewForm.showed_up === null || reviewForm.would_jam_again === null || submittingReview}
              onPress={handleSubmitReview}
            >
              <Text style={rv.submitText}>{submittingReview ? 'Submitting...' : 'Submit Review'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setReviewModal(null); setReviewForm({ showed_up: null, would_jam_again: null }) }}>
              <Text style={rv.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report modal */}
      <Modal visible={!!reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(null)}>
        <View style={rv.overlay}>
          <View style={rv.sheet}>
            <Text style={rv.sheetTitle}>Report {reportModal?.username}</Text>
            <Text style={rp.modalSub}>Select a reason:</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[rp.reasonRow, reportReason === r.value && rp.reasonSelected]}
                onPress={() => setReportReason(r.value)}
              >
                <Text style={rp.reasonText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={rp.detailInput}
              placeholder="Optional: add details..."
              placeholderTextColor="#BBBBBB"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={[rv.submitBtn, !reportReason && rv.disabled]}
              disabled={!reportReason || submittingReport}
              onPress={handleSubmitReport}
            >
              <Text style={rv.submitText}>{submittingReport ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setReportModal(null); setReportReason(''); setReportDetails('') }}>
              <Text style={rv.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sticky bottom CTA */}
      <View style={styles.ctaBar}>
        {isOwner ? (
          <View style={styles.ownerCta}>
            <Text style={styles.ownerCtaText}>Your Jam Session</Text>
          </View>
        ) : isJoined ? (
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnLeave]}
            onPress={handleLeave}
            disabled={actionLoading}
          >
            <Text style={styles.ctaBtnTextDark}>
              {actionLoading ? '...' : '✓  Joined — Tap to Leave'}
            </Text>
          </TouchableOpacity>
        ) : isFull ? (
          <View style={[styles.ctaBtn, styles.ctaBtnFull]}>
            <Text style={styles.ctaBtnTextDark}>Session Full</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnJoin]}
            onPress={handleJoin}
            disabled={actionLoading}
          >
            <Text style={styles.ctaBtnText}>
              {actionLoading ? '...' : '👥  Join Jam for Free'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  // Hero
  hero: {
    backgroundColor: '#F0FBF7',
    padding: 24,
    paddingTop: 32,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  heroEmoji: { fontSize: 40, marginBottom: 10 },
  heroTitle: { color: '#222', fontSize: 28, fontWeight: '800', marginBottom: 14, lineHeight: 34 },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillSpots: { borderColor: '#22c55e' },
  pillFull: { borderColor: '#ef4444' },
  pillText: { color: '#717171', fontSize: 13 },
  pillTextSpots: { color: '#22c55e' },
  pillTextFull: { color: '#ef4444' },

  // Info section
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    paddingHorizontal: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  infoIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  infoMain: { color: '#222', fontSize: 15, fontWeight: '500', flex: 1 },
  infoSub: { color: '#888', fontSize: 13, marginTop: 2 },
  infoMapHint: { color: '#009E78', fontSize: 12, marginTop: 3 },
  organiserName: { color: '#009E78', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EBEBEB' },

  // Description
  section: { marginTop: 20, marginHorizontal: 16 },
  sectionTitle: { color: '#222', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  descText: { color: '#717171', fontSize: 15, lineHeight: 22 },
  readMore: { color: '#009E78', marginTop: 6, fontSize: 14, fontWeight: '600' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, marginHorizontal: 16 },
  tagPill: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: { color: '#444', fontSize: 14 },

  // Players
  playersMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmedText: { color: '#717171', fontSize: 14 },
  confirmedCount: { color: '#222', fontWeight: '700' },
  spotsText: { color: '#888', fontSize: 14 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6FAF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#009E78', fontSize: 16, fontWeight: '700' },
  playerName: { color: '#222', fontSize: 15, fontWeight: '600' },
  playerRole: { color: '#888', fontSize: 12, marginTop: 2 },

  // Chat / Delete
  chatBtn: {
    backgroundColor: '#F0FBF7',
    borderWidth: 1.5,
    borderColor: '#00C896',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  chatBtnText: { color: '#009E78', fontWeight: '600', fontSize: 15 },
  deleteBtn: { padding: 14, alignItems: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 14 },

  // Sticky CTA
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    padding: 16,
    paddingBottom: 28,
  },
  ctaBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  ctaBtnJoin: { backgroundColor: '#00C896' },
  ctaBtnLeave: { backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: '#DDDDDD' },
  ctaBtnFull: { backgroundColor: '#F7F7F7' },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaBtnTextDark: { color: '#444', fontSize: 17, fontWeight: '700' },
  ownerCta: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00C896',
  },
  ownerCtaText: { color: '#009E78', fontSize: 16, fontWeight: '700' },
  trustLine: { color: '#888', fontSize: 12, marginTop: 2 },
})

const jb = StyleSheet.create({
  badge: {
    backgroundColor: '#E6FAF5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: { color: '#009E78', fontSize: 11, fontWeight: '700' },
})

const rv = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 20 },
  question: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  yesno: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  selected: { borderColor: '#00C896', backgroundColor: '#F0FBF7' },
  yesnoText: { fontWeight: '700', color: '#222' },
  submitBtn: {
    backgroundColor: '#00C896',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabled: { backgroundColor: '#CCCCCC' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { textAlign: 'center', color: '#888', fontSize: 14, fontWeight: '600' },
  reviewBtn: {
    borderWidth: 1.5,
    borderColor: '#00C896',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  reviewBtnText: { color: '#009E78', fontWeight: '600', fontSize: 13 },
})

const rp = StyleSheet.create({
  reportLink: {},
  reportLinkText: { color: '#BBBBBB', fontSize: 12, fontWeight: '600' },
  modalSub: { color: '#717171', fontSize: 14, marginBottom: 10 },
  reasonRow: {
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reasonSelected: { borderColor: '#00C896', backgroundColor: '#F0FBF7' },
  reasonText: { color: '#222', fontSize: 14 },
  detailInput: {
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#222',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
})
