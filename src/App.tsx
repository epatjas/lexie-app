import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text } from 'react-native';
import { ProfileProvider } from './contexts/ProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your screens
import HomeScreen from './screens/HomeScreen';
import ProfileSettingsScreen from './screens/ProfileSettingsScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import ProfileSelectionScreen from './screens/ProfileSelectionScreen';
import { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Add this outside the component
const createDefaultProfile = async () => {
  try {
    console.log('Creating default profile...');
    
    // Create a default profile
    const defaultProfile = {
      id: Date.now().toString(),
      name: 'User',
      avatarId: '1'
    };
    
    // Save to user profiles
    const profilesJson = await AsyncStorage.getItem('@user_profiles');
    const profiles = profilesJson ? JSON.parse(profilesJson) : [];
    profiles.push(defaultProfile);
    await AsyncStorage.setItem('@user_profiles', JSON.stringify(profiles));
    
    // Set as active profile
    await AsyncStorage.setItem('@active_profile', defaultProfile.id);
    await AsyncStorage.setItem('@active_profile_data', JSON.stringify(defaultProfile));
    
    console.log('Default profile created and set as active');
    return defaultProfile;
  } catch (error) {
    console.error('Error creating default profile:', error);
    return null;
  }
};

export default function App() {
  // **** IMPORTANT: ALWAYS START WITH HOME SCREEN ****
  // This is the key change - default to Home, not null
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Home');
  const [isLoading, setIsLoading] = useState(true);

  // Setup profiles on startup if needed
  useEffect(() => {
    const setupProfiles = async () => {
      try {
        console.log('Setting up profiles...');
        
        // Check if user has any profiles
        const profilesJson = await AsyncStorage.getItem('@user_profiles');
        const profiles = profilesJson ? JSON.parse(profilesJson) : [];
        console.log('Found profiles:', profiles.length);
        
        // Check if there's an active profile
        const activeProfileId = await AsyncStorage.getItem('@active_profile');
        console.log('Active profile ID:', activeProfileId);
        
        // If no profiles or no active profile, set one up
        if (!profiles || profiles.length === 0) {
          await createDefaultProfile();
        } else if (!activeProfileId && profiles.length > 0) {
          await AsyncStorage.setItem('@active_profile', profiles[0].id);
          await AsyncStorage.setItem('@active_profile_data', JSON.stringify(profiles[0]));
          console.log('Set first profile as active:', profiles[0].id);
        }
      } catch (error) {
        console.error('Error setting up profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupProfiles();
  }, []);

  // Show loading until profiles are set up
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <Text style={{ color: 'white' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ProfileProvider>
      <View style={{ flex: 1 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRoute}>
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
              {/* Add other screens here */}
            </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </View>
    </ProfileProvider>
  );
} 