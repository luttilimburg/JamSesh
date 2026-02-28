import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import MapView from 'react-native-maps'
import * as Location from 'expo-location'
import client from '../api/client'

const GENRES = ['jazz', 'rock', 'pop', 'hiphop', 'classical', 'other']
const SKILLS = ['beginner', 'intermediate', 'advanced']

const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

function defaultDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(19, 0, 0, 0)
  return d
}

function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function CreateJamScreen({ navigation }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('jazz')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [location, setLocation] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState([])
  const [maxParticipants, setMaxParticipants] = useState('5')
  const [date, setDate] = useState(defaultDate())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION)
  const [loading, setLoading] = useState(false)
  const searchTimer = useRef(null)
  const scrollRef = useRef(null)
  const locationY = useRef(0)

  async function searchLocation(query) {
    if (query.length < 3) { setLocationResults([]); return }
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?q=' +
          encodeURIComponent(query) +
          '&format=json&limit=5&addressdetails=1',
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'MusiMeet/1.0' } }
      )
      setLocationResults(await res.json())
    } catch {
      setLocationResults([])
    }
  }

  function onLocationChange(text) {
    setLocationQuery(text)
    setLocation('')
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchLocation(text), 400)
  }

  function pickLocation(item) {
    setLocation(item.display_name)
    setLocationQuery(item.display_name)
    setLocationResults([])
  }

  async function openMap() {
    let region = DEFAULT_REGION
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({})
        region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      }
    } catch {}
    setMapRegion(region)
    setShowMap(true)
  }

  async function confirmMapLocation() {
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?lat=' +
          mapRegion.latitude + '&lon=' + mapRegion.longitude + '&format=json',
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'MusiMeet/1.0' } }
      )
      const data = await res.json()
      const name = data.display_name ||
        (mapRegion.latitude.toFixed(5) + ', ' + mapRegion.longitude.toFixed(5))
      setLocation(name)
      setLocationQuery(name)
    } catch {
      const fallback = mapRegion.latitude.toFixed(5) + ', ' + mapRegion.longitude.toFixed(5)
      setLocation(fallback)
      setLocationQuery(fallback)
    }
    setLocationResults([])
    setShowMap(false)
  }

  function validate() {
    if (!title.trim()) {
      Alert.alert('Missing field', 'Please enter a title.')
      return false
    }
    if (!location.trim()) {
      Alert.alert('Missing field', 'Please select a location.')
      return false
    }
    const mp = parseInt(maxParticipants)
    if (isNaN(mp) || mp < 2) {
      Alert.alert('Invalid value', 'Max participants must be at least 2.')
      return false
    }
    return true
  }

  function onDateChange(event, selected) {
    setShowDatePicker(false)
    if (event.type === 'dismissed' || !selected) return
    const next = new Date(selected)
    next.setHours(date.getHours(), date.getMinutes(), 0, 0)
    setDate(next)
    setTimeout(() => setShowTimePicker(true), 150)
  }

  function onTimeChange(event, selected) {
    setShowTimePicker(false)
    if (event.type === 'dismissed' || !selected) return
    const next = new Date(date)
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    setDate(next)
  }

  async function handleCreate() {
    if (!validate()) return
    setLoading(true)
    try {
      await client.post('/jams/', {
        title: title.trim(),
        description: description.trim(),
        genre,
        skill_level: skillLevel,
        location: location.trim(),
        date_time: date.toISOString(),
        max_participants: parseInt(maxParticipants),
      })
      navigation.goBack()
    } catch (err) {
      const data = err.response?.data
      Alert.alert('Error', data ? Object.values(data).flat().join(' ') : 'Failed to create jam.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
    >
      {/* Map picker modal */}
      <Modal visible={showMap} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
          />
          {/* Fixed centre pin */}
          <View style={styles.mapPin} pointerEvents="none">
            <Text style={{ fontSize: 38, marginBottom: 4 }}>📍</Text>
          </View>
          <View style={styles.mapBar}>
            <Text style={styles.mapHint}>Drag the map to position the pin</Text>
            <View style={styles.mapButtons}>
              <TouchableOpacity style={styles.mapCancelBtn} onPress={() => setShowMap(false)}>
                <Text style={styles.mapCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapConfirmBtn} onPress={confirmMapLocation}>
                <Text style={styles.mapConfirmText}>Confirm location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="always"
      >
        <Text style={styles.heading}>New Jam Session</Text>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Sunday Jazz Jam"
          placeholderTextColor="#BBBBBB"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's the vibe?"
          placeholderTextColor="#BBBBBB"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Genre</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={genre}
            onValueChange={setGenre}
            style={styles.picker}
            dropdownIconColor="#888"
          >
            {GENRES.map((g) => (
              <Picker.Item
                key={g}
                label={g.charAt(0).toUpperCase() + g.slice(1)}
                value={g}
                color={Platform.OS === 'android' ? '#222' : undefined}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Skill Level</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={skillLevel}
            onValueChange={setSkillLevel}
            style={styles.picker}
            dropdownIconColor="#888"
          >
            {SKILLS.map((s) => (
              <Picker.Item
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                value={s}
                color={Platform.OS === 'android' ? '#222' : undefined}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Date & Time *</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateBtnText}>{'📅 ' + fmtDate(date)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateBtn, { marginLeft: 8 }]} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.dateBtnText}>{'🕐 ' + fmtTime(date)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        <View
          onLayout={(e) => { locationY.current = e.nativeEvent.layout.y }}
        >
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            value={locationQuery}
            onChangeText={onLocationChange}
            placeholder="Search for a venue or address"
            placeholderTextColor="#BBBBBB"
            onFocus={() =>
              setTimeout(
                () => scrollRef.current?.scrollTo({ y: locationY.current - 20, animated: true }),
                300
              )
            }
          />
          <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
            <Text style={styles.mapBtnText}>🗺️  Select on map</Text>
          </TouchableOpacity>
          {location ? (
            <Text style={styles.locationPreview}>{'📍 ' + location}</Text>
          ) : null}
          {locationResults.length > 0 && (
            <View style={styles.dropdown}>
              {locationResults.map((item) => (
                <TouchableOpacity
                  key={String(item.place_id)}
                  style={styles.dropdownRow}
                  onPress={() => pickLocation(item)}
                >
                  <Text style={styles.dropdownText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>Max Participants *</Text>
        <TextInput
          style={styles.input}
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          keyboardType="number-pad"
          placeholderTextColor="#BBBBBB"
        />

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Jam'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  heading: { fontSize: 22, fontWeight: '800', color: '#00C896', marginTop: 16, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#717171', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#222',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  pickerWrap: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: { color: '#222', height: 50 },
  dateRow: { flexDirection: 'row' },
  dateBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  dateBtnText: { color: '#222', fontSize: 14 },
  mapBtn: {
    marginTop: 8,
    backgroundColor: '#F0FBF7',
    borderWidth: 1.5,
    borderColor: '#00C896',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  mapBtnText: { color: '#009E78', fontSize: 14, fontWeight: '600' },
  locationPreview: { color: '#009E78', marginTop: 8, fontSize: 13 },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    marginTop: 4,
  },
  dropdownRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownText: { color: '#222', fontSize: 14 },
  // Map modal
  mapPin: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBar: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  mapHint: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  mapButtons: { flexDirection: 'row', gap: 10 },
  mapCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapCancelText: { color: '#888', fontWeight: '600' },
  mapConfirmBtn: {
    flex: 2,
    backgroundColor: '#00C896',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapConfirmText: { color: '#fff', fontWeight: '700' },
  btn: {
    backgroundColor: '#00C896',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
