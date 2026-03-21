import { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { AuthProvider, useAuth } from './src/context/AuthContext'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import MusiciansScreen from './src/screens/MusiciansScreen'
import PublicProfileScreen from './src/screens/PublicProfileScreen'
import MessagesScreen from './src/screens/MessagesScreen'
import MyJamsScreen from './src/screens/MyJamsScreen'
import CreateJamScreen from './src/screens/CreateJamScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import ChatScreen from './src/screens/ChatScreen'
import JamDetailScreen from './src/screens/JamDetailScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#EBEBEB', paddingBottom: 4 },
        tabBarActiveTintColor: '#00C896',
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Explore: 'search',
            Musicians: 'people-outline',
            Messages: 'chatbubble-outline',
            'My Jams': 'musical-notes-outline',
            Profile: 'person-outline',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Explore" component={HomeScreen} />
      <Tab.Screen name="Musicians" component={MusiciansScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="My Jams" component={MyJamsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

function Navigation() {
  const { loading } = useAuth()
  const navigationRef = useRef(null)

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {}
      const nav = navigationRef.current
      if (!nav) return
      if (data.screen === 'JamDetail' && data.jamId) {
        nav.navigate('JamDetail', { jam: { id: data.jamId } })
      } else if (data.screen === 'Chat' && data.jamId) {
        nav.navigate('Chat', { jam: { id: data.jamId, title: data.jamTitle } })
      }
    })
    return () => sub.remove()
  }, [])

  if (loading) return null

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen
          name="CreateJam"
          component={CreateJamScreen}
          options={{ headerShown: true, title: 'New Jam Session', headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#222' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: true, headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#222' }}
        />
        <Stack.Screen
          name="JamDetail"
          component={JamDetailScreen}
          options={{ headerShown: true, headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#222', headerTitle: '' }}
        />
        <Stack.Screen
          name="PublicProfile"
          component={PublicProfileScreen}
          options={{ headerShown: true, headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#222', headerTitle: '' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: 'Settings', headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#222' }}
        />
        <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  )
}
