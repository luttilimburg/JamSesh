import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const SKILLS = ['', 'beginner', 'intermediate', 'advanced']

const STEPS = [
  {
    title: 'What do you play?',
    subtitle: 'Help other musicians find you',
  },
  {
    title: 'Where are you based?',
    subtitle: 'Find jam sessions near you',
  },
  {
    title: 'Tell your story',
    subtitle: 'Give musicians a reason to jam with you',
  },
]

export default function OnboardingScreen({ navigation }) {
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(0)
  const [instruments, setInstruments] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [saving, setSaving] = useState(false)

  async function finish() {
    setSaving(true)
    try {
      const fields = {}
      if (instruments.trim()) fields.instruments = instruments.trim()
      if (skillLevel) fields.skill_level = skillLevel
      if (location.trim()) fields.location = location.trim()
      if (bio.trim()) fields.bio = bio.trim()
      if (instagram.trim()) fields.instagram_handle = instagram.trim()
      if (Object.keys(fields).length > 0) {
        await client.patch('/users/me/', fields)
      }
      await refreshUser()
    } catch (_) {
      // best-effort — profile can be filled in later
    } finally {
      setSaving(false)
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finish()
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">

        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>{STEPS[step].title}</Text>
        <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>

        {step === 0 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="e.g. guitar, drums, bass"
              placeholderTextColor="#BBBBBB"
              value={instruments}
              onChangeText={setInstruments}
            />
            <Text style={styles.fieldLabel}>Skill level</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={skillLevel} onValueChange={setSkillLevel}>
                {SKILLS.map((s) => (
                  <Picker.Item
                    key={s}
                    label={s ? s.charAt(0).toUpperCase() + s.slice(1) : '-- Select --'}
                    value={s}
                  />
                ))}
              </Picker>
            </View>
          </>
        )}

        {step === 1 && (
          <TextInput
            style={styles.input}
            placeholder="e.g. Berlin, Germany"
            placeholderTextColor="#BBBBBB"
            value={location}
            onChangeText={setLocation}
          />
        )}

        {step === 2 && (
          <>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell other musicians a little about yourself..."
              placeholderTextColor="#BBBBBB"
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={setBio}
            />
            <Text style={styles.fieldLabel}>Instagram handle (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="@yourhandle"
              placeholderTextColor="#BBBBBB"
              autoCapitalize="none"
              value={instagram}
              onChangeText={setInstagram}
            />
          </>
        )}

        <TouchableOpacity style={styles.btn} onPress={next} disabled={saving}>
          <Text style={styles.btnText}>
            {saving ? 'Saving...' : isLast ? "Let's go!" : 'Next →'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={next} disabled={saving}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EBEBEB' },
  dotActive: { backgroundColor: '#00C896', width: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#222', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 28, lineHeight: 22 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#717171', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#222',
    marginBottom: 12,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 10, marginBottom: 12 },
  btn: {
    backgroundColor: '#00C896',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skip: { textAlign: 'center', color: '#BBBBBB', fontSize: 14 },
})
