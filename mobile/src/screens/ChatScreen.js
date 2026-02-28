import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

function MessageBubble({ msg, isMe }) {
  const time = new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  return (
    <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
      {!isMe && <Text style={styles.sender}>{msg.sender}</Text>}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={styles.bubbleText}>{msg.text}</Text>
      </View>
      <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : null]}>{time}</Text>
    </View>
  )
}

export default function ChatScreen({ route, navigation }) {
  const { jam } = route.params
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const pollRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await client.get(`/jams/${jam.id}/messages/`)
      setMessages(data)
    } catch {
      // silent fail during polling
    }
  }, [jam.id])

  useEffect(() => {
    navigation.setOptions({
      title: jam.title,
      headerStyle: { backgroundColor: '#111' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
    })
    fetchMessages()
    pollRef.current = setInterval(fetchMessages, 3000)
    return () => clearInterval(pollRef.current)
  }, [fetchMessages, jam.title, navigation])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    const trimmed = text.trim()
    setText('')
    setSending(true)
    try {
      await client.post(`/jams/${jam.id}/messages/`, { text: trimmed })
      await fetchMessages()
      listRef.current?.scrollToEnd({ animated: true })
    } catch {
      setText(trimmed)
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MessageBubble msg={item} isMe={item.sender === user?.username} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hi! 👋</Text>}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor="#555"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending || !text.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bubbleWrap: { marginBottom: 10, maxWidth: '80%' },
  bubbleWrapMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { color: '#888', fontSize: 12, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: { backgroundColor: '#7c3aed' },
  bubbleOther: { backgroundColor: '#222' },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  bubbleTime: { color: '#555', fontSize: 11, marginTop: 3, marginLeft: 4 },
  bubbleTimeMe: { marginLeft: 0, marginRight: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: { paddingVertical: 10, paddingHorizontal: 4 },
  sendBtnDisabled: { opacity: 0.3 },
  sendText: { color: '#a78bfa', fontWeight: '700', fontSize: 15 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
})
