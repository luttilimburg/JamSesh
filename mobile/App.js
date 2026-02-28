import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { AuthProvider, useAuth } from './src/context/AuthContext'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import MessagesScreen from './src/screens/MessagesScreen'
import MyJamsScreen from './src/screens/MyJamsScreen'
import CreateJamScreen from './src/screens/CreateJamScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import ChatScreen from './src/screens/ChatScreen'
import JamDetailScreen from './src/screens/JamDetailScreen'

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
            Messages: 'chatbubble-outline',
            'My Jams': 'musical-notes-outline',
            Profile: 'person-outline',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Explore" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="My Jams" component={MyJamsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

function Navigation() {
  const { loading } = useAuth()
  if (loading) return null

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
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
      <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </AuthProvider>
  )
}
